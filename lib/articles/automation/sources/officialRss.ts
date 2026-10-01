import { isIP } from "node:net";
import { normalizePublishedAt, toPlainText } from "../normalize";
import type { ArticleCandidate, SourceFetchResult } from "../types";

interface RssItem {
  title?: string;
  link?: string;
  guid?: string;
  description?: string;
  pubDate?: string;
}

export interface OfficialRssSourceConfig {
  provider: ArticleCandidate["sourceProvider"];
  name: string;
  feedUrl: string;
  allowedHosts: readonly string[];
  maxCandidates?: number;
}

const FETCH_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;

function normalizeOfficialUrl(value: string, allowedHosts: readonly string[]): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    const allowed = new Set(allowedHosts.map((item) => item.toLowerCase()));
    if (url.protocol !== "https:" || isIP(host) !== 0 || !allowed.has(host)) return null;
    if (url.username || url.password || (url.port && url.port !== "443")) return null;
    url.hash = "";
    return url.toString();
  } catch { return null; }
}
function findTagEnd(xml: string, startIndex: number): number {
  let quote: '"' | "'" | null = null;
  for (let index = startIndex; index < xml.length; index += 1) {
    const character = xml[index];
    if ((character === '"' || character === "'") && (!quote || quote === character)) {
      quote = quote === character ? null : character;
    } else if (character === ">" && !quote) return index;
  }
  return -1;
}

function parseRss(xml: string): RssItem[] | null {
  const items: RssItem[] = [];
  let currentItem: RssItem | null = null;
  let activeField: keyof RssItem | null = null;
  let activeFieldDepth = 0;
  let index = 0;
  while (index < xml.length) {
    if (xml.startsWith("<![CDATA[", index)) {
      const endIndex = xml.indexOf("]]>", index + 9);
      if (endIndex === -1) return null;
      if (currentItem && activeField) currentItem[activeField] = (currentItem[activeField] || "") + xml.slice(index + 9, endIndex);
      index = endIndex + 3;
      continue;
    }
    if (xml.startsWith("<!--", index)) {
      const endIndex = xml.indexOf("-->", index + 4);
      if (endIndex === -1) return null;
      index = endIndex + 3;
      continue;
    }    if (xml.startsWith("<?", index)) {
      const endIndex = xml.indexOf("?>", index + 2);
      if (endIndex === -1) return null;
      index = endIndex + 2;
      continue;
    }
    if (xml[index] !== "<") {
      const nextTag = xml.indexOf("<", index);
      const text = xml.slice(index, nextTag === -1 ? xml.length : nextTag);
      if (currentItem && activeField) currentItem[activeField] = (currentItem[activeField] || "") + text;
      index = nextTag === -1 ? xml.length : nextTag;
      continue;
    }
    const tagEnd = findTagEnd(xml, index + 1);
    if (tagEnd === -1) return null;
    const rawTag = xml.slice(index + 1, tagEnd).trim();
    const isClosing = rawTag.startsWith("/");
    const isSelfClosing = rawTag.endsWith("/");
    const tagName = rawTag.replace(/^\//, "").replace(/\/$/, "").trim().split(/\s+/, 1)[0]?.toLowerCase();
    if (!tagName) return null;
    if (!isClosing && tagName === "item") {
      if (currentItem) return null;
      currentItem = {};
    } else if (isClosing && tagName === "item") {
      if (!currentItem || activeField) return null;
      items.push(currentItem);
      currentItem = null;
    } else if (currentItem) {
      const fields: Record<string, keyof RssItem> = { title: "title", link: "link", guid: "guid", description: "description", pubdate: "pubDate" };
      const field = fields[tagName];      if (!isClosing && field && !activeField) {
        activeField = field;
        activeFieldDepth = 1;
        if (isSelfClosing) { activeField = null; activeFieldDepth = 0; }
      } else if (activeField) {
        if (!isClosing && !isSelfClosing) activeFieldDepth += 1;
        else if (isClosing) {
          activeFieldDepth -= 1;
          if (activeFieldDepth === 0) activeField = null;
        }
      }
    }
    index = tagEnd + 1;
  }
  return currentItem || activeField ? null : items;
}

async function fetchXml(config: OfficialRssSourceConfig): Promise<string> {
  const initialUrl = normalizeOfficialUrl(config.feedUrl, config.allowedHosts);
  if (!initialUrl) throw new Error("Configured official RSS URL is not allowed");
  let currentUrl: string = initialUrl;
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(currentUrl, { redirect: "manual", signal: controller.signal, headers: { Accept: "application/rss+xml, application/xml, text/xml" } });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        const nextUrl = location ? normalizeOfficialUrl(new URL(location, currentUrl).toString(), config.allowedHosts) : null;
        if (!nextUrl) throw new Error("Official RSS redirected outside allowlist");
        currentUrl = nextUrl;
        continue;
      }      if (!response.ok) throw new Error(`Official RSS failed (${response.status})`);
      if (!normalizeOfficialUrl(response.url, config.allowedHosts)) throw new Error("Official RSS resolved outside allowlist");
      const contentType = response.headers.get("content-type") || "";
      if (!/(rss\+xml|application\/xml|text\/xml)/i.test(contentType)) throw new Error(`Unexpected RSS content type: ${contentType}`);
      return await response.text();
    } finally { clearTimeout(timeout); }
  }
  throw new Error("Official RSS exceeded redirect limit");
}

export async function fetchOfficialRssCandidates(config: OfficialRssSourceConfig): Promise<SourceFetchResult> {
  try {
    const items = parseRss(await fetchXml(config));
    if (!items) throw new Error("invalid_feed");
    const candidates: ArticleCandidate[] = [];
    let skippedItemCount = 0;
    for (const item of items) {
      if (candidates.length >= (config.maxCandidates ?? 10)) break;
      const title = toPlainText(item.title || "");
      const canonicalUrl = normalizeOfficialUrl(item.link || "", config.allowedHosts);
      if (!title || !canonicalUrl) { skippedItemCount += 1; continue; }
      const externalId = item.guid ? normalizeOfficialUrl(item.guid, config.allowedHosts) : undefined;
      const summary = toPlainText(item.description || "");
      const publishedAt = normalizePublishedAt(item.pubDate);
      candidates.push({ sourceProvider: config.provider, sourceName: config.name, sourceUrl: config.feedUrl,
        ...(externalId ? { externalId } : {}), canonicalUrl, title, ...(summary ? { summary } : {}), ...(publishedAt ? { publishedAt } : {}) });
    }
    return { sourceProvider: config.provider, sourceName: config.name, sourceUrl: config.feedUrl, candidates, skippedItemCount };
  } catch (error) {
    console.error(`${config.provider} RSS fetch failed:`, error);
    return { sourceProvider: config.provider, sourceName: config.name, sourceUrl: config.feedUrl, candidates: [], skippedItemCount: 0,
      error: error instanceof Error && error.message === "invalid_feed" ? "invalid_feed" : "fetch_failed" };
  }
}