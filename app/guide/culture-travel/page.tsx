import { SITE_URL } from "@/lib/config";
import React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date";

export const metadata = {
  title: "한독 문화·여행 가이드 - GermanHanguk",
  description: "한독 소통과 관계, 음식·축제·계절문화부터 독일과 한국의 지역·자연·전통문화 여행까지 정리한 문화·여행 가이드입니다.",
  alternates: { canonical: SITE_URL + "/guide/culture-travel" },
  openGraph: {
    title: "한독 문화·여행 가이드 - GermanHanguk",
    description: "한국과 독일의 문화를 고정관념 없이 이해하고 지역과 일상을 직접 경험하는 방법을 확인하세요.",
    type: "website",
    url: SITE_URL + "/guide/culture-travel",
  },
};

type Topic = { title: string; slug: string; defaultDesc: string };

const relationshipTopics: Topic[] = [
  { title: "독일의 직설 화법과 한국의 눈치 — 한독 소통과 개인공간 이해", slug: "german-korean-communication-culture-guide", defaultDesc: "직접·간접 표현, 거절, 침묵과 개인공간을 확인 가능한 기대 차이로 이해하고 한독 대화의 오해를 줄입니다." },
  { title: "독일에서 친구 만들기 — Verein·Stammtisch·Feierabend 문화", slug: "german-friendship-social-life-guide", defaultDesc: "독일에서 반복되는 취미활동과 모임을 통해 관계를 만들고 초대·약속·연락의 기대를 확인합니다." },
  { title: "한국에서 친구 만들기 — 모임·관계·나이와 친밀감의 문화", slug: "korean-friendship-social-life-guide", defaultDesc: "한국의 소개·모임·식사와 나이·호칭의 맥락을 이해하면서 세대와 개인차를 존중하는 방법입니다." },
  { title: "한독 집 초대 문화 — 시간·신발·음식·선물·귀가 에티켓", slug: "german-korean-home-invitation-culture-guide", defaultDesc: "집 초대에서 도착시간, 신발, 음식, 선물과 귀가 기대를 확인하고 편안하게 합의하는 방법을 안내합니다." },
  { title: "한독 친구·데이트·관계문화 — 연락·비용·거리감·관계의 시작", slug: "german-korean-relationship-culture-guide", defaultDesc: "연락, 약속, 비용, 개인공간과 관계 정의를 국적·성별 공식이 아닌 당사자 간 합의로 조정합니다." },
];

const foodTopics: Topic[] = [
  { title: "독일 음식문화 — 빵·Abendbrot·지역음식·맥주와 와인", slug: "german-food-culture-guide", defaultDesc: "독일의 빵과 식사, 지역음식·맥주·와인을 생활문화와 지역 역사 속에서 경험합니다." },
  { title: "한국 식사문화 — 함께 먹기·반찬·고기·술자리와 선택권", slug: "korean-food-dining-culture-guide", defaultDesc: "공유 음식과 반찬, 주문·계산과 술자리의 맥락을 이해하면서 개인의 선택을 지키는 방법입니다." },
];

const seasonalTopics: Topic[] = [
  { title: "독일 축제와 계절문화 — Advent·Karneval·Volksfest와 지역성", slug: "german-festivals-seasonal-culture-guide", defaultDesc: "독일의 축제와 계절 행사를 지역 전통과 현재 공동체의 문화로 이해하는 방법을 설명합니다." },
  { title: "한국 명절과 계절문화 — 설·추석·봄·여름·가을의 생활문화", slug: "korean-holidays-seasonal-culture-guide", defaultDesc: "한국의 명절과 계절문화를 전통과 현재 생활의 변화 속에서 이해하고 여행 시기를 준비합니다." },
];

const travelTopics: Topic[] = [
  { title: "대도시를 넘어 독일 여행 — 연방주·소도시·역사·문화루트", slug: "german-regional-cultural-travel-guide", defaultDesc: "역사, 산업, 종교, 건축, 음식과 자연이라는 관심사로 독일의 지역문화 여행을 설계합니다." },
  { title: "서울 밖의 한국 여행 — 역사도시·산·바다·지역문화", slug: "korean-regional-cultural-travel-guide", defaultDesc: "서울 외 지역을 역사·자연·음식·살아 있는 지역문화라는 관심사로 선택해 여행합니다." },
  { title: "독일 Wandern과 자연여행 — 숲·와인길·해안·산악문화", slug: "german-hiking-nature-culture-guide", defaultDesc: "독일의 Wandern 문화를 이해하고 코스·날씨·보호규칙을 확인해 안전하게 준비합니다." },
  { title: "한국 전통문화를 직접 경험하는 여행 — 한옥·사찰·시장·살아있는 문화유산", slug: "korean-traditional-culture-experience-guide", defaultDesc: "한옥·사찰·시장과 살아 있는 문화유산을 공동체와 전승 맥락을 존중하며 경험합니다." },
  { title: "한국의 도시 여가문화 — 카페·한강·찜질방·방 문화·야간생활", slug: "korean-urban-leisure-culture-guide", defaultDesc: "한국의 도시 여가를 도시별·세대별 선택으로 이해하고 자신의 취향과 경계에 맞게 경험합니다." },
];

export default async function CultureTravelHubPage() {
  const { data: dbGuides } = await supabase
    .from("guides")
    .select("id, slug, title, description, last_verified_at")
    .eq("category", "culture-travel")
    .eq("status", "published")
    .eq("language", "ko")
    .order("published_at", { ascending: false });

  const activeGuides = dbGuides || [];

  function renderTopicList(topics: readonly Topic[]) {
    return <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {topics.map((topic) => {
        const matchedDb = activeGuides.find((guide) => guide.slug === topic.slug);
        const isPublished = !!matchedDb;

        return <div key={topic.slug} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", boxSizing: "border-box" }}>
          <div style={{ flex: "1 1 300px", minWidth: "260px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", margin: "0 0 6px", color: isPublished ? "#0f172a" : "#64748b", wordBreak: "keep-all" }}>{isPublished ? matchedDb.title : topic.title}</h3>
            <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5", margin: "0 0 6px", wordBreak: "keep-all" }}>{isPublished ? matchedDb.description : topic.defaultDesc}</p>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>{isPublished ? "정식 가이드 게시됨 · 마지막 검증일: " + formatDate(matchedDb.last_verified_at) : "에디터 집필 중 · 2026 하반기 공개 예정"}</p>
          </div>
          {isPublished ? <Link href={"/guide/" + matchedDb.slug} style={{ textDecoration: "none" }}><button style={{ padding: "6px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}>가이드 읽기</button></Link> : <span style={{ fontSize: "12px", color: "#94a3b8", background: "#f1f5f9", padding: "4px 10px", borderRadius: "4px", fontWeight: "500" }}>준비 중</span>}
        </div>;
      })}
    </div>;
  }

  const sections = [
    ["🤝 소통과 관계", "Kommunikation & Beziehungen", relationshipTopics],
    ["🍽️ 음식과 식사문화", "Essen & Tischkultur", foodTopics],
    ["🎉 축제·명절과 계절", "Feste & Jahreszeiten", seasonalTopics],
    ["🧭 지역·자연·문화여행", "Regionen & Kulturreisen", travelTopics],
  ] as const;

  return <main style={{ minHeight: "80vh", padding: "40px 0 80px", background: "#f8fafc" }}><div className="wrapper" style={{ maxWidth: "800px", margin: "0 auto", padding: "0 20px" }}>
    <div style={{ marginBottom: "20px", fontSize: "14px" }}><Link href="/guide" style={{ textDecoration: "none", color: "#64748b" }}>생활정보 가이드</Link><span style={{ color: "#94a3b8", margin: "0 8px" }}>&gt;</span><span style={{ color: "#0f172a", fontWeight: "bold" }}>문화·여행 (Kultur & Reisen)</span></div>
    <div style={{ marginBottom: "40px" }}><h1 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: "bold", color: "#0f172a", margin: "0 0 12px", lineHeight: "1.3" }}><span style={{ display: "inline-block" }}>✈️ 한독 문화·여행 가이드</span>{" "}<span style={{ display: "inline-block" }}>Kultur & Reisen</span></h1><p style={{ fontSize: "15px", color: "#64748b", lineHeight: "1.6", margin: 0 }}>한국과 독일의 소통·관계·음식·계절문화를 이해하고, 두 나라의 지역과 자연·전통·도시문화를 고정관념 없이 직접 경험하는 방법을 확인하세요.</p></div>
    {sections.map(([title, subtitle, topics], index) => <section key={subtitle} style={{ marginBottom: index === sections.length - 1 ? 0 : "40px" }}><h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}><span style={{ display: "inline-block" }}>{title}</span>{" "}<span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>({subtitle})</span></h2>{renderTopicList(topics)}</section>)}
  </div></main>;
}
