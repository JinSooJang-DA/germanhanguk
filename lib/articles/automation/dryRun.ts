import { fetchBundesregierungArticleCandidates } from "./sources/bundesregierung";
import { findDuplicateCandidates } from "./identity";
import { classifyArticleRelevance } from "./relevance";
import type {
  ArticleCandidate,
  ArticleAutomationDryRunResult,
  ArticleRelevanceClassification,
  ArticleRelevanceResult,
} from "./types";

type DownstreamArticleRelevanceClassification = Exclude<
  ArticleRelevanceClassification,
  "irrelevant"
>;

interface ClassifiedArticleCandidate {
  candidate: ArticleCandidate;
  relevance: ArticleRelevanceResult;
}

interface DownstreamClassifiedArticleCandidate extends ClassifiedArticleCandidate {
  relevance: ArticleRelevanceResult & {
    classification: DownstreamArticleRelevanceClassification;
  };
}

function isDownstreamCandidate(
  candidate: ClassifiedArticleCandidate,
): candidate is DownstreamClassifiedArticleCandidate {
  return candidate.relevance.classification !== "irrelevant";
}

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
  const classifiedCandidates = result.candidates.map((candidate) => {
    const relevance = classifyArticleRelevance(candidate);
    classificationCounts[relevance.classification] += 1;

    return {
      candidate,
      relevance,
    };
  });
  const candidates = classifiedCandidates.map(({ candidate, relevance }) => {
    return {
      title: candidate.title,
      canonicalUrl: candidate.canonicalUrl,
      ...(candidate.publishedAt ? { publishedAt: candidate.publishedAt } : {}),
      ...relevance,
    };
  });
  const downstreamClassifiedCandidates = classifiedCandidates.filter(isDownstreamCandidate);
  const duplicateResults = findDuplicateCandidates(
    downstreamClassifiedCandidates.map(({ candidate }) => candidate),
  );
  const downstreamCandidates = duplicateResults.map((result, index) => ({
    title: result.candidate.title,
    classification: downstreamClassifiedCandidates[index].relevance.classification,
    hasExternalId: Boolean(result.candidate.externalId?.trim()),
    normalizedCanonicalUrl: result.identity.normalizedCanonicalUrl,
    fingerprint: result.identity.fingerprint,
    ...(result.duplicateOfIndex === undefined
      ? {}
      : { duplicateOfIndex: result.duplicateOfIndex }),
  }));

  return {
    sourceProvider: result.sourceProvider,
    sourceName: result.sourceName,
    sourceUrl: result.sourceUrl,
    candidateCount: candidates.length,
    skippedItemCount: result.skippedItemCount,
    classificationCounts,
    candidates,
    downstreamCandidateCount: downstreamCandidates.length,
    duplicateCandidateCount: downstreamCandidates.filter(
      (candidate) => candidate.duplicateOfIndex !== undefined,
    ).length,
    downstreamCandidates,
    ...(result.error ? { error: result.error } : {}),
  };
}
