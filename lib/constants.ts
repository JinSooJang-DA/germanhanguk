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

export interface PostRegionPolicy {
  usesRegion: boolean;
  required: boolean;
  label: string;
}

const DEFAULT_POST_REGION_POLICY: PostRegionPolicy = {
  usesRegion: true,
  required: false,
  label: "관련 지역 (선택)",
};

const POST_REGION_POLICIES: Record<CategoryValue, PostRegionPolicy> = {
  community: { usesRegion: false, required: false, label: "" },
  life: { usesRegion: true, required: false, label: "관련 지역 (선택)" },
  education: { usesRegion: true, required: false, label: "관련 지역 (선택)" },
  market: { usesRegion: true, required: true, label: "거래 지역" },
  jobs: { usesRegion: true, required: true, label: "근무/구인 지역" },
};

export function getPostRegionPolicy(category: string): PostRegionPolicy {
  return POST_REGION_POLICIES[category as CategoryValue] ?? DEFAULT_POST_REGION_POLICY;
}

export function getPostRegionValue(category: string, region: string): string | null {
  const policy = getPostRegionPolicy(category);
  const normalizedRegion = region.trim();

  return policy.usesRegion && normalizedRegion ? normalizedRegion : null;
}

export function shouldDisplayPostRegion(
  category: string,
  region: string | null | undefined,
): boolean {
  return getPostRegionPolicy(category).usesRegion && Boolean(region?.trim());
}

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

export interface GuideCategoryMapping {
  dbCategory: string;
  hubSlug: string;
  label: {
    ko: string;
    de: string;
    en: string;
  };
  communityCategory: CategoryValue;
}

// Guides use DB category values that are not always identical to their public hub URLs.
// Keep their display labels and community destinations explicit in one place.
export const GUIDE_CATEGORY_MAPPINGS: readonly GuideCategoryMapping[] = [
  { dbCategory: "visa-residence", hubSlug: "visa-residence", label: { ko: "비자·행정", de: "Visum & Behörden", en: "Visa & Bureaucracy" }, communityCategory: "life" },
  { dbCategory: "jobs", hubSlug: "jobs", label: { ko: "취업·직장", de: "Arbeit & Beruf", en: "Jobs & Career" }, communityCategory: "jobs" },
  { dbCategory: "education", hubSlug: "education", label: { ko: "유학·교육", de: "Studium & Ausbildung", en: "Study & Education" }, communityCategory: "education" },
  { dbCategory: "housing", hubSlug: "housing", label: { ko: "집·이사", de: "Wohnen & Umzug", en: "Housing & Relocation" }, communityCategory: "life" },
  { dbCategory: "tax", hubSlug: "taxes", label: { ko: "세금", de: "Steuern", en: "Taxes" }, communityCategory: "life" },
  { dbCategory: "insurance", hubSlug: "insurance", label: { ko: "보험", de: "Versicherungen", en: "Insurance" }, communityCategory: "life" },
  { dbCategory: "driving", hubSlug: "driving", label: { ko: "교통·운전", de: "Verkehr & Führerschein", en: "Traffic & Driving" }, communityCategory: "life" },
  { dbCategory: "german-life", hubSlug: "german-life", label: { ko: "독일생활", de: "Leben in DE", en: "German Life" }, communityCategory: "life" },
  { dbCategory: "korean-life", hubSlug: "korean-life", label: { ko: "한국생활", de: "Leben in KR", en: "Korean Life" }, communityCategory: "community" },
  { dbCategory: "language", hubSlug: "language", label: { ko: "언어", de: "Sprache", en: "Language" }, communityCategory: "community" },
  { dbCategory: "culture-travel", hubSlug: "culture-travel", label: { ko: "문화·여행", de: "Kultur & Reisen", en: "Culture & Travel" }, communityCategory: "community" },
] as const;

function getGuideCategoryMapping(value: string): GuideCategoryMapping | undefined {
  return GUIDE_CATEGORY_MAPPINGS.find(function(mapping) {
    return mapping.dbCategory === value;
  });
}

export function getGuideCategoryLabel(value: string, locale: "ko" | "de" | "en" = "ko"): string {
  const mapping = getGuideCategoryMapping(value);
  if (mapping) return mapping.label[locale] || mapping.label.ko;

  const cat = GUIDE_CATEGORIES.find((c) => c.value === value);
  if (!cat) return value;
  return cat.label[locale] || cat.label.ko;
}

export function getGuideCategoryHubSlug(value: string): string {
  return getGuideCategoryMapping(value)?.hubSlug || value;
}

export function getGuideCommunityCategory(value: string): CategoryValue {
  return getGuideCategoryMapping(value)?.communityCategory || "community";
}
