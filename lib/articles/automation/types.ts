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

export interface ArticleAutomationDryRunResult {
  sourceProvider: ArticleCandidate["sourceProvider"];
  sourceName: string;
  sourceUrl: string;
  candidateCount: number;
  skippedItemCount: number;
  classificationCounts: Record<ArticleRelevanceClassification, number>;
  candidates: (Pick<ArticleCandidate, "title" | "canonicalUrl" | "publishedAt"> &
    ArticleRelevanceResult)[];
  error?: SourceFetchResult["error"];
}
