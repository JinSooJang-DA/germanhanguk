import type { ArticleCandidate, ArticleRelevanceClassification } from "./types";

export const ARTICLE_DRAFT_CATEGORIES = [
  "정책",
  "생활",
  "교통",
  "교육",
  "노동",
  "세금",
  "건강",
  "가족",
  "주거",
] as const;

export type ArticleDraftCategory = (typeof ARTICLE_DRAFT_CATEGORIES)[number];

export interface ArticleDraftEvidence {
  source: {
    provider: ArticleCandidate["sourceProvider"];
    name: string;
    canonicalUrl: string;
    publishedAt?: string;
  };
  facts: {
    headline: string;
    sourceSummary?: string;
  };
  relevance: {
    classification: Exclude<ArticleRelevanceClassification, "irrelevant">;
    matchedTopics: string[];
  };
}

export interface GeneratedArticleDraft {
  title: string;
  summary: string;
  content: string;
  category: ArticleDraftCategory;
  sourceUrls: Array<{ title: string; url: string }>;
}
