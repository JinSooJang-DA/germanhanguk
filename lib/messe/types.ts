export interface MesseEventCandidate {
  sourceProvider: "messe-duesseldorf";
  sourceEventId: string;
  sourceUrl: string;
  title: string;
  summary?: string;
  startsOn: string;
  endsOn: string;
  city: string;
  venue: string;
  officialUrl?: string;
}

export interface MesseFetchResult {
  sourceProvider: MesseEventCandidate["sourceProvider"];
  sourceUrl: string;
  events: MesseEventCandidate[];
  skippedEventCount: number;
  error?: "fetch_failed" | "invalid_calendar";
}
