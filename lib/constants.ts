export interface Category {
  value: string;
  label: {
    ko: string;
    de: string;
    en: string;
  };
}

export const CATEGORIES: readonly Category[] = [
  { value: "community", label: { ko: "자유게시판", de: "Community", en: "Community" } },
  { value: "life", label: { ko: "생활정보", de: "Leben in Deutschland", en: "Life Info" } },
  { value: "education", label: { ko: "유학·교육", de: "Studium & Ausbildung", en: "Study & Education" } },
  { value: "market", label: { ko: "중고장터", de: "Flohmarkt", en: "Marketplace" } },
  { value: "jobs", label: { ko: "구인구직", de: "Jobs & Karriere", en: "Jobs" } },
] as const;

export type CategoryValue = typeof CATEGORIES[number]["value"];

export function getCategoryLabel(value: string, locale: "ko" | "de" | "en" = "ko"): string {
  const cat = CATEGORIES.find((c) => c.value === value);
  if (!cat) {
    if (value === "events") return locale === "ko" ? "행사" : "Events";
    return value;
  }
  return cat.label[locale] || cat.label.ko;
}
