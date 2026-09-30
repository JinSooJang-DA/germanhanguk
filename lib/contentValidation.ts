export const POST_TITLE_MIN_LENGTH = 2;
export const POST_TITLE_MAX_LENGTH = 100;
export const POST_CONTENT_MIN_LENGTH = 2;
export const POST_CONTENT_MAX_LENGTH = 20_000;
export const COMMENT_MIN_LENGTH = 1;
export const COMMENT_MAX_LENGTH = 2_000;

export interface TextValidationRule {
  label: string;
  minLength: number;
  maxLength: number;
}

export const POST_TITLE_RULE: TextValidationRule = {
  label: "제목",
  minLength: POST_TITLE_MIN_LENGTH,
  maxLength: POST_TITLE_MAX_LENGTH,
};

export const POST_CONTENT_RULE: TextValidationRule = {
  label: "본문",
  minLength: POST_CONTENT_MIN_LENGTH,
  maxLength: POST_CONTENT_MAX_LENGTH,
};

export const COMMENT_RULE: TextValidationRule = {
  label: "댓글",
  minLength: COMMENT_MIN_LENGTH,
  maxLength: COMMENT_MAX_LENGTH,
};

export interface TextValidationResult {
  value: string;
  characterCount: number;
  errorMessage: string | null;
}

interface DatabaseErrorLike {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

export function countUnicodeCharacters(value: string): number {
  return Array.from(value).length;
}

export function formatCharacterCount(value: string, maxLength: number): string {
  return `${formatNumber(countUnicodeCharacters(value.trim()))} / ${formatNumber(maxLength)}`;
}

export function validateText(value: string, rule: TextValidationRule): TextValidationResult {
  const normalizedValue = value.trim();
  const characterCount = countUnicodeCharacters(normalizedValue);

  if (characterCount < rule.minLength || characterCount > rule.maxLength) {
    return {
      value: normalizedValue,
      characterCount,
      errorMessage: `${rule.label}은 ${formatNumber(rule.minLength)}자 이상 ${formatNumber(rule.maxLength)}자 이하로 입력해주세요.`,
    };
  }

  return { value: normalizedValue, characterCount, errorMessage: null };
}

export function getContentValidationDatabaseMessage(
  error: DatabaseErrorLike,
  contentType: "post" | "comment",
): string | null {
  const details = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const relevantColumns = contentType === "post" ? /title|content/ : /content/;

  if (
    error.code === "23514" ||
    ((error.code === "23502" || error.code === "22001") && relevantColumns.test(details))
  ) {
    return "입력한 내용을 다시 확인해주세요. 글자 수 제한을 초과했거나 필요한 내용이 비어 있습니다.";
  }

  return null;
}

function formatNumber(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
