import { SITE_URL } from "@/lib/config";
import React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date";

export const metadata = {
  title: "한국생활 가이드 - GermanHanguk",
  description: "한국 입국, 통신·결제·교통, 의료, 한독 송금·국제배송과 재외국민 행정까지 정리한 한국생활 가이드입니다.",
  alternates: { canonical: SITE_URL + "/guide/korean-life" },
  openGraph: {
    title: "한국생활 가이드 - GermanHanguk",
    description: "한국에서 실제 생활 서비스를 이용하고 독일과 한국 사이의 행정·금융·물류를 처리하는 방법을 확인하세요.",
    type: "website",
    url: SITE_URL + "/guide/korean-life",
  },
};

type Topic = { title: string; slug: string; defaultDesc: string };

const entryTopics: Topic[] = [
  { title: "독일에서 한국 입국 준비하기 — 무비자, K-ETA와 e-Arrival Card", slug: "german-korea-entry-keta-guide", defaultDesc: "독일 국적자의 한국 단기입국을 기준으로 무비자 체류, K-ETA와 전자입국신고를 구분해 준비합니다." },
  { title: "독일 거주 한국인의 한국 방문 행정 준비 체크리스트", slug: "german-korean-home-visit-preparation-guide", defaultDesc: "일시 귀국 전에 여권, 독일 재입국 서류, 한국 전자민원·은행·휴대전화 접근을 점검합니다." },
  { title: "한국 입국 세관 가이드 — 면세한도, 현금과 신고물품", slug: "german-korea-traveler-customs-guide", defaultDesc: "여행자 휴대품, 현금, 의약품·식품과 자진신고 절차를 최신 기준으로 확인합니다." },
];

const dailyServiceTopics: Topic[] = [
  { title: "한국 SIM·eSIM과 휴대전화 본인인증 가이드", slug: "german-korea-sim-esim-verification-guide", defaultDesc: "데이터·전화번호·SMS·본인인증이 각각 무엇을 지원하는지 구분해 통신수단을 선택합니다." },
  { title: "한국 결제 가이드 — 해외카드, 현금, ATM과 모바일 결제", slug: "german-korea-payment-card-atm-guide", defaultDesc: "해외카드, 원화결제와 DCC, ATM 수수료와 결제 실패 대비 방법을 정리합니다." },
  { title: "한국 대중교통과 교통카드 사용 가이드", slug: "german-korea-public-transport-card-guide", defaultDesc: "지하철·시내버스 교통카드의 구매·충전, 승하차 태그와 지역별 환승 차이를 안내합니다." },
  { title: "한국 철도·고속버스·택시 이용 가이드", slug: "german-korea-rail-bus-taxi-guide", defaultDesc: "KTX·SRT·고속버스·택시의 운영사, 예약·결제와 환불 절차를 확인합니다." },
];

const localUseTopics: Topic[] = [
  { title: "한국 주소와 택배·배달 서비스 이용 가이드", slug: "german-korea-address-delivery-guide", defaultDesc: "도로명주소·상세주소와 숙소 택배, 배달·반품 서비스의 이용 조건을 정리합니다." },
  { title: "한국 병원·약국·응급상황 이용 가이드", slug: "german-korea-medical-pharmacy-emergency-guide", defaultDesc: "외래진료·약국·보험 증빙과 112·119·1330의 역할을 실제 상황에 맞게 구분합니다." },
];

const connectionTopics: Topic[] = [
  { title: "독일↔한국 해외송금 가이드", slug: "german-korea-remittance-guide", defaultDesc: "수취정보·환율·수수료와 독일 AWV 지급신고를 세무 문제와 구분해 확인합니다." },
  { title: "독일↔한국 국제배송과 양국 세관 가이드", slug: "german-korea-international-shipping-customs-guide", defaultDesc: "개인 소포의 세관신고, 한국 150달러 기준과 독일 수입부가세·관세를 구분합니다." },
  { title: "독일에서 이용하는 한국 영사서비스 가이드", slug: "german-korean-consular-services-guide", defaultDesc: "관할 공관, 재외국민등록, 여권과 공증·위임장 등 영사민원 준비 방법을 안내합니다." },
  { title: "독일에서 한국 가족관계서류와 위임장 준비하기", slug: "german-korean-family-documents-guide", defaultDesc: "가족·기본·혼인관계 증명서의 종류와 발급·위임·번역 요구를 구분합니다." },
  { title: "해외에서 한국 전자민원과 본인인증 이용하기", slug: "german-korean-digital-government-authentication-guide", defaultDesc: "정부24·재외동포365와 공동인증서 등 해외에서 사용할 인증수단을 구분합니다." },
];

export default async function KoreanLifeHubPage() {
  const { data: dbGuides } = await supabase
    .from("guides")
    .select("id, slug, title, description, last_verified_at")
    .eq("category", "korean-life")
    .eq("status", "published")
    .eq("language", "ko")
    .order("published_at", { ascending: false });

  const activeGuides = dbGuides || [];

  function renderTopicList(topics: readonly Topic[]) {
    return <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {topics.map((topic) => {
        const matchedDb = activeGuides.find((guide) => guide.slug === topic.slug);
        const isPublished = !!matchedDb;

        return <div key={topic.slug} style={{ background: "var(--gh-card-surface)", border: "2px solid var(--gh-card-border)", borderRadius: "0", boxShadow: "var(--gh-card-shadow)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", boxSizing: "border-box" }}>
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
    ["🛬 한국 방문·입국 준비", "Einreise & Vorbereitung", entryTopics],
    ["📱 결제와 이동 생활", "Alltag & Mobilität", dailyServiceTopics],
    ["🏥 현지 서비스 이용", "Leben in Korea", localUseTopics],
    ["🌐 한독 연결과 행정", "Deutschland & Korea", connectionTopics],
  ] as const;

  return <main style={{ minHeight: "80vh", padding: "40px 0 80px", background: "var(--gh-page-bg)" }}><div className="wrapper" style={{ maxWidth: "800px", margin: "0 auto", padding: "0 20px" }}>
    <div style={{ marginBottom: "20px", fontSize: "14px" }}><Link href="/guide" style={{ textDecoration: "none", color: "#64748b" }}>생활정보 가이드</Link><span style={{ color: "#94a3b8", margin: "0 8px" }}>&gt;</span><span style={{ color: "#0f172a", fontWeight: "bold" }}>한국생활 (Leben in Korea)</span></div>
    <div style={{ marginBottom: "40px" }}><h1 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: "bold", color: "#0f172a", margin: "0 0 12px", lineHeight: "1.3" }}><span style={{ display: "inline-block" }}>🇰🇷 한국생활 가이드</span>{" "}<span style={{ display: "inline-block" }}>Leben in Korea</span></h1><p style={{ fontSize: "15px", color: "#64748b", lineHeight: "1.6", margin: 0 }}>한국 입국과 현지 통신·결제·교통·의료부터 독일과 한국 사이의 송금·배송, 재외국민 행정까지 실제 생활에 필요한 절차를 단계별로 확인하세요.</p></div>
    {sections.map(([title, subtitle, topics], index) => <section key={subtitle} style={{ marginBottom: index === sections.length - 1 ? 0 : "40px" }}><h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}><span style={{ display: "inline-block" }}>{title}</span>{" "}<span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>({subtitle})</span></h2>{renderTopicList(topics)}</section>)}
  </div></main>;
}
