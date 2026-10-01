import { fetchOfficialRssCandidates } from "./officialRss";

export function fetchBamfArticleCandidates() {
  return fetchOfficialRssCandidates({
    provider: "bamf",
    name: "Bundesamt für Migration und Flüchtlinge – Presse",
    feedUrl: "https://www.bamf.de/SiteGlobals/Functions/RSS/DE/Feed/RSSNewsfeed_Pressemitteilungen.xml",
    allowedHosts: ["bamf.de", "www.bamf.de"],
  });
}