import { fetchOfficialRssCandidates } from "./officialRss";

export function fetchBmjvArticleCandidates() {
  return fetchOfficialRssCandidates({
    provider: "bmjv",
    name: "Bundesministerium der Justiz und für Verbraucherschutz – Presse",
    feedUrl: "https://www.bmjv.de/SiteGlobals/Functions/RSSNewsfeed/DE/RSSNewsfeed/RSSNewsfeedPressemitteilungen.xml?nn=149878",
    allowedHosts: ["bmjv.de", "www.bmjv.de"],
  });
}