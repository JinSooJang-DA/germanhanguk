import { SITE_URL } from "@/lib/config";
import React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date";

export const metadata = {
  title: "독일생활 가이드 - GermanHanguk",
  description: "독일 정착 초기 체크리스트부터 은행, 통신, 의료, 소비자계약과 이사 후 주소변경까지 정리한 생활 가이드입니다.",
  alternates: { canonical: SITE_URL + "/guide/german-life" },
  openGraph: {
    title: "독일생활 가이드 - GermanHanguk",
    description: "독일에서 실제 생활을 시작할 때 필요한 정착·계약·의료·일상 정보를 단계별로 확인하세요.",
    type: "website",
    url: SITE_URL + "/guide/german-life",
  },
};

type Topic = { title: string; slug: string; defaultDesc: string };

const settlementTopics: Topic[] = [
  { title: "독일 생활 정착 체크리스트 — Anmeldung 이후 첫 30일", slug: "german-life-settlement-checklist-guide", defaultDesc: "주소등록 뒤 은행·통신·에너지·보험·우편을 어떤 순서로 정리할지 안내합니다." },
  { title: "독일 Rundfunkbeitrag 가이드 — WG 중복 납부와 등록·해지", slug: "german-rundfunkbeitrag-guide", defaultDesc: "주택 단위 방송부담금의 WG 처리, 등록·변경·해지와 조건부 면제·감면을 설명합니다." },
  { title: "독일 은행계좌 가이드 — Girokonto, Basiskonto와 SEPA", slug: "german-bank-account-guide", defaultDesc: "독일 생활에 필요한 입출금계좌, IBAN·SEPA·카드·수수료 확인 방법입니다." },
  { title: "독일 SCHUFA 가이드 — 데이터 열람, Score와 임대 증명", slug: "german-schufa-guide", defaultDesc: "SCHUFA의 성격과 무료 데이터 열람, 임대용 증명서를 구분하는 방법입니다." },
];

const homeServiceTopics: Topic[] = [
  { title: "독일 휴대전화 계약 가이드 — Prepaid, Laufzeit와 번호이동", slug: "german-mobile-phone-guide", defaultDesc: "Prepaid·약정 요금제, 자동연장, 해지와 번호이동을 확인합니다." },
  { title: "독일 집 인터넷 가이드 — 설치, Anbieterwechsel과 이사", slug: "german-home-internet-guide", defaultDesc: "주소별 회선 확인, 설치·속도 증빙, 업체 변경과 이사 처리를 안내합니다." },
  { title: "독일 전기·가스 계약 가이드 — Grundversorgung부터 Jahresabrechnung까지", slug: "german-electricity-gas-guide", defaultDesc: "계량기 기록, 기본공급, 월 납부액과 연간정산을 관리하는 방법입니다." },
  { title: "독일 우편·DHL 가이드 — 주소 작성, Paket 수령과 Nachsendeservice", slug: "german-post-dhl-guide", defaultDesc: "주소·우편함 이름, 소포 수령과 이사 후 우편 전달을 정리합니다." },
];

const dailyLifeTopics: Topic[] = [
  { title: "독일 쓰레기 분리배출 가이드 — Restmüll, Bio, Verpackung과 Pfand", slug: "german-waste-sorting-guide", defaultDesc: "주요 폐기물 유형과 Pfand를 이해하고 지자체별 규칙을 확인합니다." },
  { title: "독일 공휴일·영업시간 가이드 — Bundesland별 차이와 일요일 예외", slug: "german-opening-hours-holidays-guide", defaultDesc: "연방주별 공휴일과 주별 영업규정을 구분하고 생활을 준비합니다." },
  { title: "독일 병원 이용 가이드 — Hausarzt, Facharzt와 Notaufnahme", slug: "german-doctor-hospital-guide", defaultDesc: "증상에 맞게 가정의·전문의·병원·응급실을 이용하는 흐름을 안내합니다." },
  { title: "독일 약국·응급상황 가이드 — Apotheke, 116117과 112", slug: "german-pharmacy-emergency-guide", defaultDesc: "약국·야간 당번약국과 116117·112의 역할을 정확히 구분합니다." },
];

const contractTopics: Topic[] = [
  { title: "독일 소비자계약 가이드 — Widerruf, Kündigung과 온라인 해지", slug: "german-consumer-contract-cancellation-guide", defaultDesc: "온라인·매장 계약의 철회권 차이, 계약 해지와 증빙 보관을 설명합니다." },
  { title: "독일 이사 후 주소변경 가이드 — 기관·계약별 체크리스트", slug: "german-address-change-guide", defaultDesc: "주소등록 뒤 은행·보험·고용주·통신·에너지 주소를 바꾸는 순서입니다." },
];

export default async function GermanLifeHubPage() {
  const { data: dbGuides } = await supabase
    .from("guides")
    .select("id, slug, title, description, last_verified_at")
    .eq("category", "german-life")
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
    ["🧭 정착과 금융", "Ankommen & Finanzen", settlementTopics],
    ["🏠 집 생활 인프라", "Verträge & Haushalt", homeServiceTopics],
    ["🩺 일상·의료 생활", "Alltag & Gesundheit", dailyLifeTopics],
    ["📝 계약과 이사 마무리", "Verbraucher & Umzug", contractTopics],
  ] as const;

  return <main style={{ minHeight: "80vh", padding: "40px 0 80px", background: "#f8fafc" }}><div className="wrapper" style={{ maxWidth: "800px", margin: "0 auto", padding: "0 20px" }}>
    <div style={{ marginBottom: "20px", fontSize: "14px" }}><Link href="/guide" style={{ textDecoration: "none", color: "#64748b" }}>생활정보 가이드</Link><span style={{ color: "#94a3b8", margin: "0 8px" }}>&gt;</span><span style={{ color: "#0f172a", fontWeight: "bold" }}>독일생활 (Leben in Deutschland)</span></div>
    <div style={{ marginBottom: "40px" }}><h1 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: "bold", color: "#0f172a", margin: "0 0 12px", lineHeight: "1.3" }}><span style={{ display: "inline-block" }}>🇩🇪 독일생활 가이드</span>{" "}<span style={{ display: "inline-block" }}>Leben in Deutschland</span></h1><p style={{ fontSize: "15px", color: "#64748b", lineHeight: "1.6", margin: 0 }}>독일 생활을 시작한 뒤 필요한 은행·통신·에너지·우편·의료·소비자계약과 이사 후 주소변경까지 실제 행동 순서로 확인하세요.</p></div>
    {sections.map(([title, subtitle, topics], index) => <section key={subtitle} style={{ marginBottom: index === sections.length - 1 ? 0 : "40px" }}><h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}><span style={{ display: "inline-block" }}>{title}</span>{" "}<span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>({subtitle})</span></h2>{renderTopicList(topics)}</section>)}
  </div></main>;
}
