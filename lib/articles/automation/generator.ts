import type { ArticleDraftEvidence, GeneratedArticleDraft } from "./draft";

/**
 * Provider-neutral boundary for AI-backed draft generation.
 * Implementations may only receive source-backed evidence through this contract.
 */
export interface ArticleDraftGenerator {
  generate(evidence: ArticleDraftEvidence): Promise<GeneratedArticleDraft>;
}
