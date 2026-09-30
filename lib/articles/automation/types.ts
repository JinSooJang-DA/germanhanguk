/**
 * External source data before AI generation or database persistence.
 * This intentionally differs from the public `Article` database model.
 */
export interface ArticleCandidate {
  sourceProvider: "bundesregierung";
  sourceName: string;
  sourceUrl: string;
  externalId?: string;
  canonicalUrl: string;
  title: string;
  summary?: string;
  publishedAt?: string;
}

export interface SourceFetchResult {
  sourceProvider: ArticleCandidate["sourceProvider"];
  sourceName: string;
  sourceUrl: string;
  candidates: ArticleCandidate[];
  skippedItemCount: number;
  error?: "fetch_failed" | "invalid_feed";
}

export type ArticleRelevanceClassification =
  | "relevant"
  | "uncertain"
  | "irrelevant";

export interface ArticleRelevanceResult {
  classification: ArticleRelevanceClassification;
  matchedTopics: string[];
  reasons: string[];
}

export type ArticleCandidateIdentityKind = "external-id" | "canonical-url";

export interface ArticleCandidateIdentity {
  kind: ArticleCandidateIdentityKind;
  normalizedCanonicalUrl: string;
  fingerprint: string;
}

export interface ArticleCandidateDuplicateResult {
  candidate: ArticleCandidate;
  identity: ArticleCandidateIdentity;
  duplicateOfIndex?: number;
}

export interface ArticleAutomationDownstreamCandidate {
  title: string;
  classification: Exclude<ArticleRelevanceClassification, "irrelevant">;
  hasExternalId: boolean;
  normalizedCanonicalUrl: string;
  fingerprint: string;
  duplicateOfIndex?: number;
}

export interface ArticleAutomationDryRunResult {
  sourceProvider: ArticleCandidate["sourceProvider"];
  sourceName: string;
  sourceUrl: string;
  candidateCount: number;
  skippedItemCount: number;
  classificationCounts: Record<ArticleRelevanceClassification, number>;
  candidates: (Pick<ArticleCandidate, "title" | "canonicalUrl" | "publishedAt"> &
    ArticleRelevanceResult)[];
  downstreamCandidateCount: number;
  duplicateCandidateCount: number;
  downstreamCandidates: ArticleAutomationDownstreamCandidate[];
  error?: SourceFetchResult["error"];
}
