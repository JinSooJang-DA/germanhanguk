import { isIP } from "node:net";

const ALLOWED_BUNDESREGIERUNG_HOSTS = new Set([
  "bundesregierung.de",
  "www.bundesregierung.de",
]);

function isAllowedBundesregierungHost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase().replace(/\.$/, "");

  return (
    isIP(normalizedHost) === 0 &&
    normalizedHost !== "localhost" &&
    ALLOWED_BUNDESREGIERUNG_HOSTS.has(normalizedHost)
  );
}

/**
 * Accept only HTTPS pages on the fixed official source domain. This module is
 * imported by the automation adapter only; it never accepts user-provided URLs.
 */
export function normalizeBundesregierungUrl(value: string): string | null {
  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      !isAllowedBundesregierungHost(url.hostname) ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    ) {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function decodeXmlEntity(entity: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
  };

  if (entity in namedEntities) {
    return namedEntities[entity];
  }

  if (entity.startsWith("#x")) {
    const codePoint = Number.parseInt(entity.slice(2), 16);
    return isValidUnicodeCodePoint(codePoint)
      ? String.fromCodePoint(codePoint)
      : "&" + entity + ";";
  }

  if (entity.startsWith("#")) {
    const codePoint = Number.parseInt(entity.slice(1), 10);
    return isValidUnicodeCodePoint(codePoint)
      ? String.fromCodePoint(codePoint)
      : "&" + entity + ";";
  }

  return "&" + entity + ";";
}

function isValidUnicodeCodePoint(codePoint: number): boolean {
  return (
    Number.isInteger(codePoint) &&
    codePoint >= 0 &&
    codePoint <= 0x10ffff &&
    (codePoint < 0xd800 || codePoint > 0xdfff)
  );
}

/** Converts RSS text or HTML descriptions into plain display metadata only. */
export function toPlainText(value: string): string {
  let result = "";
  let insideTag = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === "<") {
      insideTag = true;
      continue;
    }

    if (character === ">") {
      insideTag = false;
      continue;
    }

    if (insideTag) {
      continue;
    }

    if (character === "&") {
      const semicolonIndex = value.indexOf(";", index + 1);
      if (semicolonIndex !== -1) {
        result += decodeXmlEntity(value.slice(index + 1, semicolonIndex));
        index = semicolonIndex;
        continue;
      }
    }

    result += character;
  }

  return result.replace(/\s+/g, " ").trim();
}

export function normalizePublishedAt(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
