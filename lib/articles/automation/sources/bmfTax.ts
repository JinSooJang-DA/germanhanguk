import { normalizeBmfUrl, normalizePublishedAt, toPlainText } from "../normalize";
import type { ArticleCandidate, SourceFetchResult } from "../types";

const BMF_TAX_RSS_URL =
  "https://www.bundesfinanzministerium.de/SiteGlobals/Functions/RSSFeed/DE/Steuern/RSSSteuern.xml";
const SOURCE_NAME = "Bundesministerium der Finanzen – Steuern";
const FETCH_TIMEOUT_MS = 8_000;
const MAX_CANDIDATES = 10;
const MAX_REDIRECTS = 3;

interface RssItem {
  title?: string;
  link?: string;
  guid?: string;
  description?: string;
  pubDate?: string;
}

function findTagEnd(xml: string, startIndex: number): number {
  let quote: '"' | "'" | null = null;

  for (let index = startIndex; index < xml.length; index += 1) {
    const character = xml[index];
    if ((character === '"' || character === "'") && (!quote || quote === character)) {
      quote = quote === character ? null : character;
    } else if (character === ">" && !quote) {
      return index;
    }
  }

  return -1;
}

/**
 * A deliberately narrow, fail-closed tokenizer for the fixed RSS 2.0 feed.
 * It handles only item/title/link/guid/description/pubDate text and CDATA;
 * it is not a general-purpose XML parser.
 */
function parseBmfRss(xml: string): RssItem[] | null {
  const items: RssItem[] = [];
  let currentItem: RssItem | null = null;
  let activeField: keyof RssItem | null = null;
  let activeFieldDepth = 0;
  let index = 0;

  while (index < xml.length) {
    if (xml.startsWith("<![CDATA[", index)) {
      const endIndex = xml.indexOf("]]>", index + 9);
      if (endIndex === -1) return null;
      if (currentItem && activeField) {
        currentItem[activeField] = (currentItem[activeField] || "") + xml.slice(index + 9, endIndex);
      }
      index = endIndex + 3;
      continue;
    }

    if (xml.startsWith("<!--", index)) {
      const endIndex = xml.indexOf("-->", index + 4);
      if (endIndex === -1) return null;
      index = endIndex + 3;
      continue;
    }

    if (xml.startsWith("<?", index)) {
      const endIndex = xml.indexOf("?>", index + 2);
      if (endIndex === -1) return null;
      index = endIndex + 2;
      continue;
    }

    if (xml[index] !== "<") {
      const nextTag = xml.indexOf("<", index);
      const text = xml.slice(index, nextTag === -1 ? xml.length : nextTag);
      if (currentItem && activeField) {
        currentItem[activeField] = (currentItem[activeField] || "") + text;
      }
      index = nextTag === -1 ? xml.length : nextTag;
      continue;
    }

    const tagEnd = findTagEnd(xml, index + 1);
    if (tagEnd === -1) return null;

    const rawTag = xml.slice(index + 1, tagEnd).trim();
    const isClosingTag = rawTag.startsWith("/");
    const isSelfClosingTag = rawTag.endsWith("/");
    const tagName = rawTag
      .replace(/^\//, "")
      .replace(/\/$/, "")
      .trim()
      .split(/\s+/, 1)[0]
      ?.toLowerCase();

    if (!tagName) return null;

    if (!isClosingTag && tagName === "item") {
      if (currentItem) return null;
      currentItem = {};
    } else if (isClosingTag && tagName === "item") {
      if (!currentItem || activeField) return null;
      items.push(currentItem);
      currentItem = null;
    } else if (currentItem) {
      const fieldNames: Record<string, keyof RssItem> = {
        title: "title",
        link: "link",
        guid: "guid",
        description: "description",
        pubdate: "pubDate",
      };
      const field = fieldNames[tagName];

      if (!isClosingTag && field && !activeField) {
        activeField = field;
        activeFieldDepth = 1;
        if (isSelfClosingTag) {
          activeField = null;
          activeFieldDepth = 0;
        }
      } else if (activeField) {
        if (!isClosingTag && !isSelfClosingTag) {
          activeFieldDepth += 1;
        } else if (isClosingTag) {
          activeFieldDepth -= 1;
          if (activeFieldDepth === 0) {
            activeField = null;
          }
        }
      }
    }

    index = tagEnd + 1;
  }

  return currentItem || activeField ? null : items;
}

function normalizeBmfRssItem(item: RssItem): ArticleCandidate | null {
  const title = toPlainText(item.title || "");
  const canonicalUrl = normalizeBmfUrl(item.link || "");

  if (!title || !canonicalUrl) {
    return null;
  }

  const externalId = item.guid ? normalizeBmfUrl(item.guid) : undefined;
  const summary = toPlainText(item.description || "");

  return {
    sourceProvider: "bmf-tax",
    sourceName: SOURCE_NAME,
    sourceUrl: BMF_TAX_RSS_URL,
    ...(externalId ? { externalId } : {}),
    canonicalUrl,
    title,
    ...(summary ? { summary } : {}),
    ...(normalizePublishedAt(item.pubDate) ? { publishedAt: normalizePublishedAt(item.pubDate) } : {}),
  };
}

async function fetchAllowedRss(): Promise<string> {
  const initialUrl = normalizeBmfUrl(BMF_TAX_RSS_URL);
  if (!initialUrl) {
    throw new Error("The configured BMF tax RSS URL is not allowed.");
  }
  let currentUrl: string = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        const nextUrl = location
          ? normalizeBmfUrl(new URL(location, currentUrl).toString())
          : null;

        if (!nextUrl) {
          throw new Error("The RSS redirect target is not an allowed official URL.");
        }

        currentUrl = nextUrl;
        continue;
      }

      if (!response.ok) {
        throw new Error("The RSS request did not succeed.");
      }

      const finalUrl = normalizeBmfUrl(response.url);
      if (!finalUrl) {
        throw new Error("The RSS response resolved outside the allowed official domain.");
      }

      const contentType = response.headers.get("content-type") || "";
      if (!/^(application\/rss\+xml|application\/xml|text\/xml)(?:;|$)/i.test(contentType)) {
        throw new Error("The official source did not return an XML RSS document.");
      }

      return await response.text();
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("The RSS source exceeded the redirect limit.");
}

export async function fetchBmfTaxArticleCandidates(): Promise<SourceFetchResult> {
  try {
    const xml = await fetchAllowedRss();
    const items = parseBmfRss(xml);

    if (!items) {
      console.error("BMF tax RSS parsing failed: unsupported or malformed feed structure.");
      return {
        sourceProvider: "bmf-tax",
        sourceName: SOURCE_NAME,
        sourceUrl: BMF_TAX_RSS_URL,
        candidates: [],
        skippedItemCount: 0,
        error: "invalid_feed",
      };
    }

    let skippedItemCount = 0;
    const candidates: ArticleCandidate[] = [];

    for (const item of items) {
      if (candidates.length >= MAX_CANDIDATES) break;

      const candidate = normalizeBmfRssItem(item);
      if (!candidate) {
        skippedItemCount += 1;
        continue;
      }

      candidates.push(candidate);
    }

    return {
      sourceProvider: "bmf-tax",
      sourceName: SOURCE_NAME,
      sourceUrl: BMF_TAX_RSS_URL,
      candidates,
      skippedItemCount,
    };
  } catch (error) {
    console.error("BMF tax RSS fetch failed:", error);
    return {
      sourceProvider: "bmf-tax",
      sourceName: SOURCE_NAME,
      sourceUrl: BMF_TAX_RSS_URL,
      candidates: [],
      skippedItemCount: 0,
      error: "fetch_failed",
    };
  }
}

export const BMF_TAX_RSS_SOURCE_URL = BMF_TAX_RSS_URL;
export const BMF_TAX_DRY_RUN_MAX_CANDIDATES = MAX_CANDIDATES;
