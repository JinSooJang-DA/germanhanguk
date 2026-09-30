import { fetchBundesregierungArticleCandidates } from "./sources/bundesregierung";
import { classifyArticleRelevance } from "./relevance";
import type {
  ArticleAutomationDryRunResult,
  ArticleRelevanceClassification,
} from "./types";

/**
 * Explicit server-side development entry point. It fetches and normalizes the
 * fixed official feed, but never calls AI services or writes to Supabase.
 */
export async function runBundesregierungArticlesDryRun(): Promise<ArticleAutomationDryRunResult> {
  const result = await fetchBundesregierungArticleCandidates();
  const classificationCounts: Record<ArticleRelevanceClassification, number> = {
    relevant: 0,
    uncertain: 0,
    irrelevant: 0,
  };
  const candidates = result.candidates.map((candidate) => {
    const relevance = classifyArticleRelevance(candidate);
    classificationCounts[relevance.classification] += 1;

    return {
      title: candidate.title,
      canonicalUrl: candidate.canonicalUrl,
      ...(candidate.publishedAt ? { publishedAt: candidate.publishedAt } : {}),
      ...relevance,
    };
  });

  return {
    sourceProvider: result.sourceProvider,
    sourceName: result.sourceName,
    sourceUrl: result.sourceUrl,
    candidateCount: candidates.length,
    skippedItemCount: result.skippedItemCount,
    classificationCounts,
    candidates,
    ...(result.error ? { error: result.error } : {}),
  };
}
