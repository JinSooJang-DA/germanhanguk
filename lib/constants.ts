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
  { value: "tandem", label: { ko: "탄뎀", de: "Tandem", en: "Tandem" } },
] as const;

export type CategoryValue = typeof CATEGORIES[number]["value"];

export interface PostRegionPolicy {
  usesRegion: boolean;
  required: boolean;
  label: string;
}

export interface PostAuthoringCopy {
  titlePlaceholder: string;
  contentPlaceholder: string;
  helperText?: string;
}

export interface EducationPostOption {
  value: string;
  label: string;
}

export const EDUCATION_SUB_CATEGORY_OPTIONS: readonly EducationPostOption[] = [
  { value: "study-prep", label: "독일 유학생 되기 / 유학 준비" },
  { value: "admission", label: "입학 / 어학 / 지원서류" },
  { value: "student-diary", label: "유학생 일기 / 경험 공유" },
  { value: "campus-life", label: "학교생활 / 수업 / 시험" },
  { value: "visa", label: "비자 / 외국인청" },
  { value: "housing", label: "집구하기 / WG / 기숙사" },
  { value: "insurance", label: "보험 / 재정증명 / 생활비" },
  { value: "student-work", label: "알바 / Werkstudent / 인턴" },
  { value: "graduation-career", label: "졸업 / 취업 / 진로" },
] as const;

export function getEducationSubCategoryLabel(value: string | null | undefined): string {
  if (!value) return "유학·교육";
  return EDUCATION_SUB_CATEGORY_OPTIONS.find((option) => option.value === value)?.label || "유학·교육";
}
export const EDUCATION_TARGET_FIELD_OPTIONS: readonly EducationPostOption[] = [
  { value: "general", label: "전공 공통 / 미정" },
  { value: "music", label: "음대 / 음악" },
  { value: "art", label: "미대 / 미술·디자인" },
  { value: "engineering", label: "공대 / IT / 과학" },
  { value: "humanities", label: "인문 / 상경" },
] as const;

const DEFAULT_POST_REGION_POLICY: PostRegionPolicy = {
  usesRegion: true,
  required: false,
  label: "관련 지역 (선택)",
};

const POST_REGION_POLICIES: Record<CategoryValue, PostRegionPolicy> = {
  community: { usesRegion: false, required: false, label: "" },
  life: { usesRegion: true, required: false, label: "관련 지역" },
  education: { usesRegion: true, required: false, label: "관련 지역" },
  market: { usesRegion: true, required: true, label: "거래 지역" },
  jobs: { usesRegion: true, required: true, label: "근무 지역" },
  tandem: { usesRegion: true, required: false, label: "만나고 싶은 지역 / Ort (선택)" },
};

const DEFAULT_POST_AUTHORING_COPY: PostAuthoringCopy = {
  titlePlaceholder: "제목을 입력하세요",
  contentPlaceholder: "내용을 입력하세요",
};

const POST_AUTHORING_COPIES: Record<CategoryValue, PostAuthoringCopy> = {
  community: {
    titlePlaceholder: "자유롭게 이야기할 주제를 입력해주세요",
    contentPlaceholder: "독일 생활 이야기, 질문, 경험 등을 자유롭게 나눠보세요.",
  },
  life: {
    titlePlaceholder: "어떤 생활정보를 공유하거나 질문하고 싶으신가요?",
    contentPlaceholder: "상황과 필요한 정보를 구체적으로 적어주면 더 좋은 답변을 받을 수 있습니다.",
  },
  education: {
    titlePlaceholder: "학교, 유학, 교육과 관련된 주제를 입력해주세요",
    contentPlaceholder: "학교·전공·지원 과정 등 질문이나 경험을 구체적으로 적어주세요.",
  },
  market: {
    titlePlaceholder: "판매하거나 찾고 있는 물품을 간단히 적어주세요",
    contentPlaceholder: "물품 상태, 가격, 거래 방법 등을 적어주세요.",
    helperText: "물품 상태와 가격, 거래 방법을 적어주세요. 연락이 필요하면 오픈채팅 등 외부 링크를 사용할 수 있으며, 공개 글에는 불필요한 개인정보를 남기지 않는 것을 권장합니다.",
  },
  jobs: {
    titlePlaceholder: "채용 또는 구직 내용을 간단히 적어주세요",
    contentPlaceholder: "업무 내용, 조건, 근무 형태 등 필요한 정보를 구체적으로 적어주세요.",
    helperText: "지원자와 구직자가 판단할 수 있도록 실제 근무하거나 구하는 지역을 입력해 주세요.",
  },
  tandem: {
    titlePlaceholder: "탄뎀 파트너를 찾는 제목을 적어주세요 / Titel",
    contentPlaceholder: "사용 언어, 배우고 싶은 언어, 관심사와 원하는 교류 방식을 자유롭게 적어주세요. Deutsch oder Koreanisch ist willkommen.",
    helperText: "한국어와 독일어 어느 언어로 작성해도 좋습니다. 공개 글에는 전화번호·주소 등 불필요한 개인정보를 남기지 마세요.",
  },
};

export function getPostRegionPolicy(category: string): PostRegionPolicy {
  return POST_REGION_POLICIES[category as CategoryValue] ?? DEFAULT_POST_REGION_POLICY;
}

export function getPostAuthoringCopy(category: string): PostAuthoringCopy {
  return POST_AUTHORING_COPIES[category as CategoryValue] ?? DEFAULT_POST_AUTHORING_COPY;
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
  { value: "banking", label: { ko: "은행·금융", de: "Bank & Finanzen", en: "Banking & Finance" }, icon: "🏦", description: "은행계좌 개설, 은행별 비교, 카드·SEPA·SCHUFA" },
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
