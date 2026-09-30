import type { ArticleCandidate, ArticleRelevanceResult } from "./types";

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
  candidate: ArticleCandidate;
  relevance: ArticleRelevanceResult;
}

export interface GeneratedArticleDraft {
  title: string;
  summary: string;
  content: string;
  category: ArticleDraftCategory;
  sourceUrls: Array<{ title: string; url: string }>;
}
