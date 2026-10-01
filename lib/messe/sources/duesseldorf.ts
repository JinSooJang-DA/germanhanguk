import { isIP } from "node:net";
import { parseMesseDuesseldorfIcal } from "../ical";
import type { MesseFetchResult } from "../types";

export const MESSE_DUESSELDORF_ICAL_URL =
  "https://www.messe-duesseldorf.de/static/mdhome/cal_md_DE.ics";

const ALLOWED_HOSTS = new Set(["messe-duesseldorf.de", "www.messe-duesseldorf.de"]);
const FETCH_TIMEOUT_MS = 8_000;

function isAllowedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return url.protocol === "https:" && isIP(host) === 0 && ALLOWED_HOSTS.has(host) &&
      !url.username && !url.password && (!url.port || url.port === "443");
  } catch {
    return false;
  }
}

export async function fetchMesseDuesseldorfEvents(): Promise<MesseFetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(MESSE_DUESSELDORF_ICAL_URL, {
      signal: controller.signal,
      headers: { Accept: "text/calendar, text/plain;q=0.9" },
    });
    if (!response.ok || !isAllowedUrl(response.url)) throw new Error("fetch_failed");
    const parsed = parseMesseDuesseldorfIcal(await response.text(), MESSE_DUESSELDORF_ICAL_URL);
    if (!parsed) throw new Error("invalid_calendar");
    return {
      sourceProvider: "messe-duesseldorf",
      sourceUrl: MESSE_DUESSELDORF_ICAL_URL,
      events: parsed.events,
      skippedEventCount: parsed.skippedEventCount,
    };
  } catch (error) {
    console.error("Messe Düsseldorf calendar fetch failed:", error);
    return {
      sourceProvider: "messe-duesseldorf",
      sourceUrl: MESSE_DUESSELDORF_ICAL_URL,
      events: [],
      skippedEventCount: 0,
      error: error instanceof Error && error.message === "invalid_calendar"
        ? "invalid_calendar"
        : "fetch_failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}
