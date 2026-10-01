import type { MesseEventCandidate } from "./types";

interface RawEvent {
  uid?: string;
  summary?: string;
  description?: string;
  dtstart?: string;
  dtend?: string;
  location?: string;
}

function unfoldIcal(value: string): string[] {
  const physicalLines = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines: string[] = [];
  for (const line of physicalLines) {
    if (/^[ \t]/.test(line) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function decodeQuotedPrintable(value: string): string {
  return value.replace(/(?:=[0-9A-Fa-f]{2})+/g, (encoded) => {
    const bytes = encoded.match(/[0-9A-Fa-f]{2}/g)?.map((hex) => Number.parseInt(hex, 16)) ?? [];
    return Buffer.from(bytes).toString("utf8");
  });
}

function decodeText(value: string, quotedPrintable: boolean): string {
  const decoded = quotedPrintable ? decodeQuotedPrintable(value) : value;
  return decoded
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function dateOnly(value: string | undefined): string | null {
  const match = value?.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  const iso = `${match[1]}-${match[2]}-${match[3]}`;
  const timestamp = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(timestamp) ? null : iso;
}

function extractOfficialUrl(description: string): string | undefined {
  const match = description.match(/Mehr Informationen:\s*(https?:\/\/\S+|www\.\S+)/i);
  if (!match) return undefined;
  const raw = match[1].replace(/[),.;]+$/, "");
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function descriptionSummary(description: string, title: string): string | undefined {
  const lines = description.split("\n").map((line) => line.trim()).filter(Boolean);
  const useful = lines.filter((line) =>
    !line.toLowerCase().startsWith("gps:") &&
    !line.toLowerCase().startsWith("öffnungszeiten:") &&
    !line.toLowerCase().startsWith("mehr informationen:") &&
    !/^(mo|di|mi|do|fr|sa|so|mon|tue|wed|thu|fri|sat|sun)\b/i.test(line)
  );
  if (useful[0]?.toLowerCase() === title.toLowerCase()) useful.shift();
  return useful[0] || undefined;
}

function parseRawEvents(calendar: string): RawEvent[] | null {
  if (!calendar.includes("BEGIN:VCALENDAR") || !calendar.includes("END:VCALENDAR")) return null;
  const events: RawEvent[] = [];
  let current: RawEvent | null = null;
  for (const line of unfoldIcal(calendar)) {
    if (line === "BEGIN:VEVENT") {
      if (current) return null;
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (!current) return null;
      events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const left = line.slice(0, separator);
    const rawValue = line.slice(separator + 1);
    const [name, ...params] = left.split(";");
    const quotedPrintable = params.some((param) => param.toUpperCase() === "ENCODING=QUOTED-PRINTABLE");
    const decoded = decodeText(rawValue, quotedPrintable);
    switch (name.toUpperCase()) {
      case "UID": current.uid = decoded; break;
      case "SUMMARY": current.summary = decoded; break;
      case "DESCRIPTION": current.description = decoded; break;
      case "DTSTART": current.dtstart = decoded; break;
      case "DTEND": current.dtend = decoded; break;
      case "LOCATION": current.location = decoded; break;
    }
  }
  return current ? null : events;
}

export interface MesseIcalParseResult {
  events: MesseEventCandidate[];
  skippedEventCount: number;
}

export function parseMesseDuesseldorfIcal(calendar: string, sourceUrl: string): MesseIcalParseResult | null {
  const rawEvents = parseRawEvents(calendar);
  if (!rawEvents) return null;
  const events: MesseEventCandidate[] = [];
  let skippedEventCount = 0;
  for (const raw of rawEvents) {
    const title = raw.summary?.trim();
    const sourceEventId = raw.uid?.trim();
    const startsOn = dateOnly(raw.dtstart);
    const endsOn = dateOnly(raw.dtend) ?? startsOn;
    if (!title || !sourceEventId || !startsOn || !endsOn) {
      skippedEventCount += 1;
      continue;
    }
    const description = raw.description?.trim() || "";
    const summary = descriptionSummary(description, title);
    const officialUrl = extractOfficialUrl(description);
    events.push({
      sourceProvider: "messe-duesseldorf",
      sourceEventId,
      sourceUrl,
      title,
      ...(summary ? { summary } : {}),
      startsOn,
      endsOn,
      city: "Düsseldorf",
      venue: raw.location?.trim() || "Messe Düsseldorf",
      ...(officialUrl ? { officialUrl } : {}),
    });
  }
  return { events, skippedEventCount };
}
