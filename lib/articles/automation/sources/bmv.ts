import { isIP } from "node:net";
import { toPlainText } from "../normalize";
import type { ArticleCandidate, SourceFetchResult } from "../types";

const HOME_URL = "https://www.bmv.de/DE/Home/home.html";
const SOURCE_NAME = "Bundesministerium für Verkehr – Presse";
const ALLOWED_HOSTS = new Set(["bmv.de", "www.bmv.de"]);

function normalizeBmvUrl(value: string): string | null {
  try {
    const url = new URL(value, HOME_URL);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (url.protocol !== "https:" || isIP(host) !== 0 || !ALLOWED_HOSTS.has(host)) return null;
    if (url.username || url.password || (url.port && url.port !== "443")) return null;
    url.hash = "";
    url.pathname = url.pathname.replace(/^\/DE\/Home\//, "/");
    return url.toString();
  } catch { return null; }
}

function germanDateToIso(value: string): string | undefined {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!match) return undefined;
  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}T12:00:00+02:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function parseCards(html: string): ArticleCandidate[] {
  const candidates: ArticleCandidate[] = [];
  const cards = html.split('<li class="card card-list-item">').slice(1);
  for (const card of cards) {
    const link = card.match(/href="([^"]*SharedDocs\/DE\/Pressemitteilungen\/\d{4}\/[^"]+\.html)"/i)?.[1];    const titleRaw = card.match(/<p class="card-title">[\s\S]*?<strong>([\s\S]*?)<\/strong>/i)?.[1];
    const dateRaw = card.match(/<p class="card-date">[\s\S]*?<\/strong>\s*([^<]+)<\/p>/i)?.[1];
    const summaryRaw = card.match(/<div class="card-short-text">([\s\S]*?)<\/div>/i)?.[1];
    const canonicalUrl = link ? normalizeBmvUrl(link) : null;
    const title = toPlainText(titleRaw || "");
    if (!canonicalUrl || !title) continue;
    if (candidates.some((item) => item.canonicalUrl === canonicalUrl)) continue;
    const publishedAt = dateRaw ? germanDateToIso(dateRaw) : undefined;
    const summary = toPlainText(summaryRaw || "");
    candidates.push({
      sourceProvider: "bmv", sourceName: SOURCE_NAME, sourceUrl: HOME_URL,
      canonicalUrl, title, ...(summary ? { summary } : {}), ...(publishedAt ? { publishedAt } : {}),
    });
    if (candidates.length >= 10) break;
  }
  return candidates;
}

export async function fetchBmvArticleCandidates(): Promise<SourceFetchResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let response: Response;
    try { response = await fetch(HOME_URL, { signal: controller.signal, headers: { Accept: "text/html", "User-Agent": "GermanHanguk/1.0 official-source-reader" } }); }
    finally { clearTimeout(timeout); }
    if (!response.ok || !normalizeBmvUrl(response.url)) throw new Error(`BMV fetch failed (${response.status})`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("text/html")) throw new Error("BMV did not return HTML");
    const candidates = parseCards(await response.text());
    if (candidates.length === 0) throw new Error("BMV page structure yielded no press cards");
    return { sourceProvider: "bmv", sourceName: SOURCE_NAME, sourceUrl: HOME_URL, candidates, skippedItemCount: 0 };
  } catch (error) {
    console.error("BMV source fetch failed:", error);
    return { sourceProvider: "bmv", sourceName: SOURCE_NAME, sourceUrl: HOME_URL, candidates: [], skippedItemCount: 0, error: "fetch_failed" };
  }
}