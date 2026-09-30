import { createArticleCandidateIdentity, findDuplicateCandidates } from "./identity";
import type { ArticleCandidate, ArticleRelevanceClassification } from "./types";

export type ReservableArticleRelevanceClassification = Exclude<
  ArticleRelevanceClassification,
  "irrelevant"
>;

export interface ArticleSourceReservationInput {
  fingerprint: string;
  candidate: ArticleCandidate;
  relevanceClassification: ReservableArticleRelevanceClassification;
}

export type ArticleSourceReservationResult =
  | { status: "reserved" }
  | { status: "already_exists" };

/**
 * Source-independent persistence boundary. Future source adapters and article
 * generators only need this contract, not Supabase implementation details.
 */
export interface ArticleSourceRepository {
  reserve(input: ArticleSourceReservationInput): Promise<ArticleSourceReservationResult>;
}

function validateReservationInput(input: ArticleSourceReservationInput): void {
  const identity = createArticleCandidateIdentity(input.candidate);

  if (!identity || identity.fingerprint !== input.fingerprint) {
    throw new Error("Invalid article source reservation input.");
  }
}

/**
 * Reserves only candidates that survived deterministic relevance triage. The
 * repository implementation is responsible for its atomic persistence method.
 */
export async function reserveArticleCandidate(
  repository: ArticleSourceRepository,
  input: ArticleSourceReservationInput,
): Promise<ArticleSourceReservationResult> {
  validateReservationInput(input);
  return repository.reserve(input);
}

type InMemoryProcessingStatus = "reserved" | "processing" | "processed" | "failed";

interface InMemoryArticleSourceRow {
  fingerprint: string;
  sourceTitle: string;
  sourcePublishedAt: string | null;
  relevanceClassification: ReservableArticleRelevanceClassification;
  processingStatus: InMemoryProcessingStatus;
  articleId: string | null;
  firstSeenAt: number;
  lastSeenAt: number;
  createdAt: number;
}

interface InMemoryArticleSourceRepository extends ArticleSourceRepository {
  count(): number;
  getRow(fingerprint: string): InMemoryArticleSourceRow | undefined;
  setFutureProcessingState(
    fingerprint: string,
    processingStatus: Exclude<InMemoryProcessingStatus, "reserved">,
    articleId: string,
  ): void;
}

/** Development-only implementation used for deterministic reservation checks. */
export function createInMemoryArticleSourceRepository(): InMemoryArticleSourceRepository {
  const rows = new Map<string, InMemoryArticleSourceRow>();
  let clock = 0;

  function nextTime(): number {
    clock += 1;
    return clock;
  }

  return {
    async reserve(input) {
      const existingRow = rows.get(input.fingerprint);
      if (existingRow) {
        existingRow.lastSeenAt = nextTime();
        return { status: "already_exists" };
      }

      const now = nextTime();
      rows.set(input.fingerprint, {
        fingerprint: input.fingerprint,
        sourceTitle: input.candidate.title,
        sourcePublishedAt: input.candidate.publishedAt ?? null,
        relevanceClassification: input.relevanceClassification,
        processingStatus: "reserved",
        articleId: null,
        firstSeenAt: now,
        lastSeenAt: now,
        createdAt: now,
      });
      return { status: "reserved" };
    },
    count() {
      return rows.size;
    },
    getRow(fingerprint) {
      const row = rows.get(fingerprint);
      return row ? { ...row } : undefined;
    },
    setFutureProcessingState(fingerprint, processingStatus, articleId) {
      const row = rows.get(fingerprint);
      if (!row) {
        throw new Error("The self-check row was not reserved.");
      }

      row.processingStatus = processingStatus;
      row.articleId = articleId;
    },
  };
}

interface ReservationSelfCheckCase {
  id: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";
  passed: boolean;
}

export interface ArticleSourceReservationSelfCheckResult {
  passed: boolean;
  cases: ReservationSelfCheckCase[];
}

function testCandidate(overrides: Partial<ArticleCandidate> = {}): ArticleCandidate {
  return {
    sourceProvider: "bundesregierung",
    sourceName: "Reservation self-check",
    sourceUrl: "https://www.bundesregierung.de/service/rss/feed.xml",
    externalId: "article-42",
    canonicalUrl: "https://www.bundesregierung.de/example/article?topic=settlement",
    title: "Original title",
    summary: "Original summary",
    publishedAt: "2026-09-30T12:00:00.000Z",
    ...overrides,
  };
}

function reservationInput(
  candidate: ArticleCandidate,
  relevanceClassification: ReservableArticleRelevanceClassification = "relevant",
): ArticleSourceReservationInput {
  const identity = createArticleCandidateIdentity(candidate);
  if (!identity) {
    throw new Error("The self-check candidate must have a valid identity.");
  }

  return {
    fingerprint: identity.fingerprint,
    candidate,
    relevanceClassification,
  };
}

/** No-network, no-database validation for the persistence contract. */
export async function runArticleSourceReservationSelfCheck(): Promise<ArticleSourceReservationSelfCheckResult> {
  const base = testCandidate();
  const baseInput = reservationInput(base);
  const changedTitleInput = reservationInput(testCandidate({ title: "Changed title" }));
  const changedMetadataInput = reservationInput(
    testCandidate({
      summary: "Changed summary",
      publishedAt: "2026-10-01T12:00:00.000Z",
    }),
  );
  const differentCandidate = testCandidate({
    externalId: undefined,
    canonicalUrl: "https://www.bundesregierung.de/example/another-article",
  });
  const differentInput = reservationInput(differentCandidate, "uncertain");

  const cases: ReservationSelfCheckCase[] = [];
  const newFingerprintRepository = createInMemoryArticleSourceRepository();
  cases.push({
    id: "A",
    passed: (await reserveArticleCandidate(newFingerprintRepository, baseInput)).status === "reserved",
  });

  const duplicateRepository = createInMemoryArticleSourceRepository();
  await reserveArticleCandidate(duplicateRepository, baseInput);
  cases.push({
    id: "B",
    passed:
      (await reserveArticleCandidate(duplicateRepository, baseInput)).status === "already_exists",
  });

  const preservationRepository = createInMemoryArticleSourceRepository();
  await reserveArticleCandidate(preservationRepository, baseInput);
  const initialRow = preservationRepository.getRow(baseInput.fingerprint);
  await reserveArticleCandidate(preservationRepository, changedTitleInput);
  const titleChangedRow = preservationRepository.getRow(baseInput.fingerprint);
  cases.push({
    id: "C",
    passed:
      preservationRepository.count() === 1 &&
      initialRow?.fingerprint === titleChangedRow?.fingerprint &&
      titleChangedRow?.sourceTitle === base.title,
  });

  preservationRepository.setFutureProcessingState(
    baseInput.fingerprint,
    "processing",
    "00000000-0000-0000-0000-000000000001",
  );
  const beforeDuplicateRediscovery = preservationRepository.getRow(baseInput.fingerprint);
  await reserveArticleCandidate(preservationRepository, changedMetadataInput);
  const afterDuplicateRediscovery = preservationRepository.getRow(baseInput.fingerprint);
  cases.push({
    id: "D",
    passed:
      afterDuplicateRediscovery?.processingStatus === "processing",
  });

  cases.push({
    id: "E",
    passed:
      afterDuplicateRediscovery?.articleId === "00000000-0000-0000-0000-000000000001",
  });

  cases.push({
    id: "F",
    passed:
      afterDuplicateRediscovery?.firstSeenAt === beforeDuplicateRediscovery?.firstSeenAt &&
      afterDuplicateRediscovery?.createdAt === beforeDuplicateRediscovery?.createdAt,
  });

  cases.push({
    id: "G",
    passed:
      afterDuplicateRediscovery?.lastSeenAt !== beforeDuplicateRediscovery?.lastSeenAt &&
      afterDuplicateRediscovery?.sourceTitle === beforeDuplicateRediscovery?.sourceTitle &&
      afterDuplicateRediscovery?.sourcePublishedAt === beforeDuplicateRediscovery?.sourcePublishedAt &&
      afterDuplicateRediscovery?.relevanceClassification ===
        beforeDuplicateRediscovery?.relevanceClassification,
  });

  const duplicateCandidates = findDuplicateCandidates([base, { ...base }]);
  const uniqueCandidates = duplicateCandidates.filter(
    (candidate) => candidate.duplicateOfIndex === undefined,
  );
  const inMemoryRepository = createInMemoryArticleSourceRepository();
  const reservationResults = await Promise.all(
    uniqueCandidates.map(({ candidate, identity }) =>
      reserveArticleCandidate(inMemoryRepository, {
        fingerprint: identity.fingerprint,
        candidate,
        relevanceClassification: "relevant",
      }),
    ),
  );
  cases.push({
    id: "H",
    passed:
      duplicateCandidates.length === 2 &&
      uniqueCandidates.length === 1 &&
      reservationResults.length === 1 &&
      reservationResults[0].status === "reserved",
  });

  const differentRepository = createInMemoryArticleSourceRepository();
  const firstDifferent = await reserveArticleCandidate(differentRepository, baseInput);
  const secondDifferent = await reserveArticleCandidate(differentRepository, differentInput);
  cases.push({
    id: "I",
    passed: firstDifferent.status === "reserved" && secondDifferent.status === "reserved",
  });

  return {
    passed: cases.every((check) => check.passed),
    cases,
  };
}
