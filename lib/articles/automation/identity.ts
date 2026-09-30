import { createHash } from "node:crypto";

import type {
  ArticleCandidate,
  ArticleCandidateDuplicateResult,
  ArticleCandidateIdentity,
} from "./types";

const TRACKING_QUERY_PARAMETERS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
]);

function isTrackingQueryParameter(name: string): boolean {
  return TRACKING_QUERY_PARAMETERS.has(name.toLowerCase());
}

/**
 * Normalizes a prevalidated HTTPS article URL for deterministic identity only.
 * Source adapters remain responsible for their own host allowlists and fetch
 * security. Meaningful query parameters are intentionally preserved.
 */
export function normalizeCanonicalUrlForIdentity(value: string): string | null {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:" || url.username || url.password) {
      return null;
    }

    url.hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    url.hash = "";

    const meaningfulQueryParameters = [...url.searchParams.entries()]
      .filter(([name]) => !isTrackingQueryParameter(name))
      .sort(([leftName, leftValue], [rightName, rightValue]) => {
        const nameOrder = leftName.localeCompare(rightName);
        return nameOrder === 0 ? leftValue.localeCompare(rightValue) : nameOrder;
      });

    url.search = "";
    for (const [name, value] of meaningfulQueryParameters) {
      url.searchParams.append(name, value);
    }

    return url.toString();
  } catch {
    return null;
  }
}

function fingerprintMaterial(candidate: ArticleCandidate, normalizedCanonicalUrl: string): {
  kind: ArticleCandidateIdentity["kind"];
  value: string;
} {
  const externalId = candidate.externalId?.trim();

  if (externalId) {
    return {
      kind: "external-id",
      value: `${candidate.sourceProvider}\u0000${externalId}`,
    };
  }

  return {
    kind: "canonical-url",
    value: `${candidate.sourceProvider}\u0000${normalizedCanonicalUrl}`,
  };
}

/**
 * Builds a stable, source-scoped fingerprint. Title, summary, and publication
 * time are intentionally excluded so editorial metadata changes do not create
 * a second candidate for the same source article.
 */
export function createArticleCandidateIdentity(
  candidate: ArticleCandidate,
): ArticleCandidateIdentity | null {
  const normalizedCanonicalUrl = normalizeCanonicalUrlForIdentity(candidate.canonicalUrl);
  if (!normalizedCanonicalUrl) {
    return null;
  }

  const material = fingerprintMaterial(candidate, normalizedCanonicalUrl);
  const fingerprint = createHash("sha256").update(material.value, "utf8").digest("hex");

  return {
    kind: material.kind,
    normalizedCanonicalUrl,
    fingerprint,
  };
}

/**
 * Finds duplicate candidates within a single in-memory run. Persistence-aware
 * duplicate checks are deliberately left for a later batch.
 */
export function findDuplicateCandidates(
  candidates: ArticleCandidate[],
): ArticleCandidateDuplicateResult[] {
  const firstIndexByFingerprint = new Map<string, number>();

  return candidates.flatMap((candidate, index) => {
    const identity = createArticleCandidateIdentity(candidate);
    if (!identity) {
      return [];
    }

    const duplicateOfIndex = firstIndexByFingerprint.get(identity.fingerprint);
    if (duplicateOfIndex === undefined) {
      firstIndexByFingerprint.set(identity.fingerprint, index);
    }

    return [
      {
        candidate,
        identity,
        ...(duplicateOfIndex === undefined ? {} : { duplicateOfIndex }),
      },
    ];
  });
}

interface IdentitySelfCheckCase {
  id: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J";
  passed: boolean;
}

export interface ArticleIdentitySelfCheckResult {
  passed: boolean;
  cases: IdentitySelfCheckCase[];
}

function testCandidate(overrides: Partial<ArticleCandidate> = {}): ArticleCandidate {
  return {
    sourceProvider: "bundesregierung",
    sourceName: "Identity self-check",
    sourceUrl: "https://www.bundesregierung.de/service/rss/feed.xml",
    externalId: "article-42",
    canonicalUrl: "https://www.bundesregierung.de/example/article?topic=settlement",
    title: "Original title",
    summary: "Original summary",
    publishedAt: "2026-09-30T12:00:00.000Z",
    ...overrides,
  };
}

function fingerprintOf(candidate: ArticleCandidate): string | null {
  return createArticleCandidateIdentity(candidate)?.fingerprint ?? null;
}

/** Lightweight deterministic checks for the identity invariants, with no test dependency. */
export function runArticleIdentitySelfCheck(): ArticleIdentitySelfCheckResult {
  const base = testCandidate();
  const noExternalId = testCandidate({ externalId: undefined });
  const trackingA = testCandidate({
    externalId: undefined,
    canonicalUrl:
      "https://www.bundesregierung.de/example/article?topic=settlement&utm_source=feed",
  });
  const trackingB = testCandidate({
    externalId: undefined,
    canonicalUrl:
      "https://www.bundesregierung.de/example/article?utm_campaign=autumn&topic=settlement",
  });

  const cases: IdentitySelfCheckCase[] = [
    {
      id: "A",
      passed: (() => {
        const duplicates = findDuplicateCandidates([base, { ...base }]);
        return (
          duplicates.length === 2 &&
          duplicates[0].identity.fingerprint === duplicates[1].identity.fingerprint &&
          duplicates[1].duplicateOfIndex === 0
        );
      })(),
    },
    {
      id: "B",
      passed: fingerprintOf(base) === fingerprintOf(testCandidate({ title: "Changed title" })),
    },
    {
      id: "C",
      passed:
        fingerprintOf(base) ===
        fingerprintOf(
          testCandidate({
            summary: "Changed summary",
            publishedAt: "2026-10-01T12:00:00.000Z",
          }),
        ),
    },
    { id: "D", passed: fingerprintOf(trackingA) === fingerprintOf(trackingB) },
    {
      id: "E",
      passed:
        fingerprintOf(noExternalId) !==
        fingerprintOf(
          testCandidate({
            externalId: undefined,
            canonicalUrl: "https://www.bundesregierung.de/example/article?topic=tax",
          }),
        ),
    },
    {
      id: "F",
      passed:
        fingerprintOf(noExternalId) !==
        fingerprintOf(
          testCandidate({
            externalId: undefined,
            canonicalUrl: "https://www.bundesregierung.de/example/another-article",
          }),
        ),
    },
    {
      id: "G",
      passed:
        fingerprintOf(
          testCandidate({
            externalId: undefined,
            canonicalUrl: "https://www.bundesregierung.de/example/article?topic=settlement#first",
          }),
        ) ===
        fingerprintOf(
          testCandidate({
            externalId: undefined,
            canonicalUrl: "https://www.bundesregierung.de/example/article?topic=settlement#second",
          }),
        ),
    },
    {
      id: "H",
      passed:
        fingerprintOf(
          testCandidate({
            externalId: undefined,
            canonicalUrl: "https://www.bundesregierung.de/example/article?id=123&lang=de",
          }),
        ) ===
        fingerprintOf(
          testCandidate({
            externalId: undefined,
            canonicalUrl: "https://www.bundesregierung.de/example/article?lang=de&id=123",
          }),
        ),
    },
    {
      id: "I",
      passed:
        fingerprintOf(testCandidate({ externalId: "abc123" })) ===
        fingerprintOf(testCandidate({ externalId: "  abc123  " })),
    },
    {
      id: "J",
      passed: (() => {
        const emptyExternalId = createArticleCandidateIdentity(testCandidate({ externalId: "" }));
        const whitespaceExternalId = createArticleCandidateIdentity(
          testCandidate({ externalId: "   " }),
        );
        const canonicalFallback = createArticleCandidateIdentity(noExternalId);

        return (
          emptyExternalId?.kind === "canonical-url" &&
          whitespaceExternalId?.kind === "canonical-url" &&
          emptyExternalId.fingerprint === canonicalFallback?.fingerprint &&
          whitespaceExternalId.fingerprint === canonicalFallback?.fingerprint
        );
      })(),
    },
  ];

  return {
    passed: cases.every((check) => check.passed),
    cases,
  };
}
