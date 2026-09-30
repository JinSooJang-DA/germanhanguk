import { fetchBundesregierungArticleCandidates } from "./sources/bundesregierung";
import type { ArticleAutomationDryRunResult } from "./types";

/**
 * Explicit server-side development entry point. It fetches and normalizes the
 * fixed official feed, but never calls AI services or writes to Supabase.
 */
export async function runBundesregierungArticlesDryRun(): Promise<ArticleAutomationDryRunResult> {
  const result = await fetchBundesregierungArticleCandidates();

  return {
    sourceProvider: result.sourceProvider,
    sourceName: result.sourceName,
    sourceUrl: result.sourceUrl,
    candidateCount: result.candidates.length,
    skippedItemCount: result.skippedItemCount,
    candidates: result.candidates.map(({ title, canonicalUrl, publishedAt }) => ({
      title,
      canonicalUrl,
      ...(publishedAt ? { publishedAt } : {}),
    })),
    ...(result.error ? { error: result.error } : {}),
  };
}
