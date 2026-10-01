import { fetchOfficialRssCandidates } from "./officialRss";

export function fetchBmbfsfjArticleCandidates() {
  return fetchOfficialRssCandidates({
    provider: "bmbfsfj",
    name: "Bundesministerium für Bildung und Familie – Aktuelles",
    feedUrl: "https://www.bmbfsfj.bund.de/service/rss/bmbfsfj/108854/feed.rss",
    allowedHosts: ["bmbfsfj.bund.de", "www.bmbfsfj.bund.de"],
  });
}