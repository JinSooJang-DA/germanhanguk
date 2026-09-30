import {
  ARTICLE_DRAFT_CATEGORIES,
  type ArticleDraftEvidence,
  type GeneratedArticleDraft,
} from "./draft";

export type ArticleDraftValidationError =
  | "invalid_title"
  | "invalid_summary"
  | "invalid_content"
  | "invalid_category"
  | "missing_source"
  | "untrusted_source";

export interface ArticleDraftValidationResult {
  valid: boolean;
  errors: ArticleDraftValidationError[];
}

const MAX_TITLE_LENGTH = 255;
const MAX_SUMMARY_LENGTH = 800;
const MAX_CONTENT_LENGTH = 20_000;
function isNonEmptyWithin(value: string, maxLength: number): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength;
}

function normalizeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Validates shape and source provenance before any draft can be persisted.
 * Factual entailment remains a separate provider/evidence concern.
 */
export function validateGeneratedArticleDraft(
  draft: GeneratedArticleDraft,
  evidence: ArticleDraftEvidence,
): ArticleDraftValidationResult {
  const errors: ArticleDraftValidationError[] = [];
  if (!isNonEmptyWithin(draft.title, MAX_TITLE_LENGTH)) errors.push("invalid_title");
  if (!isNonEmptyWithin(draft.summary, MAX_SUMMARY_LENGTH)) errors.push("invalid_summary");
  if (!isNonEmptyWithin(draft.content, MAX_CONTENT_LENGTH)) errors.push("invalid_content");
  if (!ARTICLE_DRAFT_CATEGORIES.includes(draft.category)) errors.push("invalid_category");

  const expectedUrl = normalizeUrl(evidence.source.canonicalUrl);
  if (draft.sourceUrls.length === 0) {
    errors.push("missing_source");
  } else {
    const hasExpectedSource = draft.sourceUrls.some((source) => {
      return source.title.trim().length > 0 && normalizeUrl(source.url) === expectedUrl;
    });
    if (!expectedUrl || !hasExpectedSource) errors.push("untrusted_source");
  }

  return { valid: errors.length === 0, errors };
}
