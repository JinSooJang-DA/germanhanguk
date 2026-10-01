import { fetchOfficialRssCandidates } from "./officialRss";

export function fetchBmgArticleCandidates() {
  return fetchOfficialRssCandidates({
    provider: "bmg",
    name: "Bundesministerium für Gesundheit – Aktuelle Meldungen",
    feedUrl: "https://www.bundesgesundheitsministerium.de/meldungen.xml",
    allowedHosts: ["bundesgesundheitsministerium.de", "www.bundesgesundheitsministerium.de"],
  });
}