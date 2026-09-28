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


export interface GuideCategory {
  value: string;
  label: {
    ko: string;
    de: string;
    en: string;
  };
  icon: string;
  description: string;
}

export const GUIDE_CATEGORIES: readonly GuideCategory[] = [
  { value: "visa", label: { ko: "비자·행정", de: "Visum & Behörden", en: "Visa & Bureaucracy" }, icon: "📄", description: "거주허가, 비자 신청, 안멜둥 등 행정 정보" },
  { value: "jobs", label: { ko: "취업·직장", de: "Arbeit & Beruf", en: "Jobs & Career" }, icon: "💼", description: "독일 현지 취업, 레주메 작성, 근로계약" },
  { value: "education", label: { ko: "유학·교육", de: "Studium & Ausbildung", en: "Study & Education" }, icon: "🎓", description: "독일 대학 입학, 어학원, 아우스빌둥" },
  { value: "housing", label: { ko: "집·이사", de: "Wohnen & Umzug", en: "Housing & Relocation" }, icon: "🏠", description: "독일 방 구하기, 미트페트라크, 안멜둥" },
  { value: "taxes", label: { ko: "세금", de: "Steuern", en: "Taxes" }, icon: "💶", description: "연말정산, 슈토이어클라세, 세금 번호" },
  { value: "insurance", label: { ko: "보험", de: "Versicherungen", en: "Insurance" }, icon: "🏥", description: "공보험과 사보험, 책임보험 등 독일 보험" },
  { value: "driving", label: { ko: "교통·운전", de: "Verkehr & Führerschein", en: "Traffic & Driving" }, icon: "🚗", description: "면허 교환, 독일 교통 규칙, 차량 구매" },
  { value: "german-life", label: { ko: "독일생활", de: "Leben in DE", en: "German Life" }, icon: "🇩🇪", description: "현지 마트, 쓰레기 분리수거, 일상 상식" },
  { value: "korean-life", label: { ko: "한국생활", de: "Leben in KR", en: "Korean Life" }, icon: "🇰🇷", description: "한국 방문, 역이민, 한국 거주 팁" },
  { value: "language", label: { ko: "언어", de: "Sprache", en: "Language" }, icon: "🗣️", description: "독일어 학습 요령, 현지 표현, 어학 시험" },
  { value: "culture-travel", label: { ko: "문화·여행", de: "Kultur & Reisen", en: "Culture & Travel" }, icon: "✈️", description: "독일 주말 휴일, 연차 사용, 기차 여행" },
] as const;

export function getGuideCategoryLabel(value: string, locale: "ko" | "de" | "en" = "ko"): string {
  const cat = GUIDE_CATEGORIES.find((c) => c.value === value);
  if (!cat) return value;
  return cat.label[locale] || cat.label.ko;
}
