import type { ArticleDraftEvidence } from "./draft";
import type { ArticleCandidate, ArticleRelevanceResult } from "./types";

const MAX_HEADLINE_LENGTH = 500;
const MAX_SUMMARY_LENGTH = 2_000;

function bounded(value: string | undefined, maxLength: number): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

/** Builds the only source-backed factual payload a draft generator may receive. */
export function createArticleDraftEvidence(
  candidate: ArticleCandidate,
  relevance: ArticleRelevanceResult,
): ArticleDraftEvidence {
  if (relevance.classification === "irrelevant") {
    throw new Error("Irrelevant candidates cannot become draft evidence.");
  }

  const headline = bounded(candidate.title, MAX_HEADLINE_LENGTH);
  if (!headline) throw new Error("Draft evidence requires a source headline.");

  return {
    source: {
      provider: candidate.sourceProvider,
      name: candidate.sourceName,
      canonicalUrl: candidate.canonicalUrl,
      ...(candidate.publishedAt ? { publishedAt: candidate.publishedAt } : {}),
    },
    facts: {
      headline,
      ...(bounded(candidate.summary, MAX_SUMMARY_LENGTH)
        ? { sourceSummary: bounded(candidate.summary, MAX_SUMMARY_LENGTH) }
        : {}),
    },
    relevance: {
      classification: relevance.classification,
      matchedTopics: [...relevance.matchedTopics],
    },
  };
}
