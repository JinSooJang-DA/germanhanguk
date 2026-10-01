import { fetchOfficialRssCandidates } from "./officialRss";

export function fetchBmwsbArticleCandidates() {
  return fetchOfficialRssCandidates({
    provider: "bmwsb",
    name: "Bundesministerium für Wohnen – Aktuelles",
    feedUrl: "https://www.bmwsb.bund.de/DE/tools-services/rssfeed/_functions/rssnewsfeed.xml?nn=42910",
    allowedHosts: ["bmwsb.bund.de", "www.bmwsb.bund.de"],
  });
}