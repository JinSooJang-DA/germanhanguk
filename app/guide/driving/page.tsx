import { SITE_URL } from "@/lib/config";
import React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date";

export const metadata = {
  title: "독일 교통·운전 가이드 - GermanHanguk",
  description: "독일 대중교통, Deutschlandticket, 한국 운전면허, 차량 구매·등록과 사고 대응까지 정리한 교통·운전 가이드입니다.",
  alternates: { canonical: SITE_URL + "/guide/driving" },
  openGraph: {
    title: "독일 교통·운전 가이드 - GermanHanguk",
    description: "대중교통부터 운전면허·차량 생활까지 독일 이동의 핵심 절차를 확인하세요.",
    type: "website",
    url: SITE_URL + "/guide/driving",
  },
};

type Topic = { title: string; slug: string; defaultDesc: string };

const publicTransportTopics: Topic[] = [
  { title: "독일 대중교통 이용 가이드 — Verkehrsverbund와 티켓 이해하기", slug: "german-public-transport-guide", defaultDesc: "독일의 버스·트램·U-Bahn·S-Bahn을 지역 교통권과 함께 이해하고 실수 없이 이용하는 방법입니다." },
  { title: "Deutschlandticket 가이드 — 적용 교통수단과 구독 해지", slug: "german-deutschlandticket-guide", defaultDesc: "Deutschlandticket의 적용 범위, 장거리 열차 예외와 구독 관리에서 확인할 사항을 정리합니다." },
  { title: "독일 기차 여행 가이드 — Deutsche Bahn 예약과 Fahrgastrechte", slug: "german-rail-travel-passenger-rights-guide", defaultDesc: "기차 여행 예약과 지연·취소 시 증빙 및 승객 권리를 확인하는 실전 가이드입니다." },
  { title: "독일 자전거 교통규칙 가이드 — Radweg와 안전장비", slug: "german-bicycle-traffic-rules-guide", defaultDesc: "독일 자전거 도로 규칙, 장비, 주차와 사고 대응을 정리합니다." },
];

const licenseTopics: Topic[] = [
  { title: "한국 운전면허로 독일에서 운전하기 — 6개월 기준과 국제면허", slug: "german-korean-driving-license-use-guide", defaultDesc: "한국 면허의 독일 운전 가능 기간, 통상 거주지와 면허 원본·번역을 확인합니다." },
  { title: "한국 운전면허 독일 교환 가이드 — Umschreibung 절차", slug: "german-korean-driving-license-conversion-guide", defaultDesc: "Anlage 11 기준의 한국 면허 교환 시 시험·등급·서류를 안내합니다." },
  { title: "독일 운전면허 신규 취득 가이드 — Fahrschule부터 시험까지", slug: "german-driving-license-acquisition-guide", defaultDesc: "Fahrschule 선택부터 이론·실기 시험까지 신규 면허 취득 흐름을 정리합니다." },
];

const vehicleTopics: Topic[] = [
  { title: "독일 자동차·중고차 구매 가이드 — Kaufvertrag와 차량 상태 확인", slug: "german-car-buying-used-car-guide", defaultDesc: "새 차·중고차 구매 시 차량 서류, 계약, 검사와 인수 전 확인사항을 안내합니다." },
  { title: "독일 차량등록 가이드 — Zulassung, 번호판과 Kfz-Steuer", slug: "german-vehicle-registration-tax-guide", defaultDesc: "eVB, 차량등록 문서, 번호판과 Kfz-Steuer의 관계를 설명합니다." },
  { title: "독일 TÜV·HU·AU 가이드 — 차량검사와 재검사 대응", slug: "german-hu-au-vehicle-inspection-guide", defaultDesc: "정기검사 HU와 결함·재검사 대응을 정리합니다." },
  { title: "독일 주차·Umweltzone 가이드 — 표지판과 Umweltplakette", slug: "german-parking-environment-zone-guide", defaultDesc: "주차 표지, 주민주차와 환경구역을 지역별 차이를 고려해 안내합니다." },
];

const safetyTopics: Topic[] = [
  { title: "독일 운전규칙·속도위반 가이드 — Bußgeld와 Flensburg 벌점", slug: "german-driving-rules-fines-points-guide", defaultDesc: "도로 규칙 위반 뒤 과태료, 운전금지와 Flensburg 점수를 확인합니다." },
  { title: "독일 교통사고 대응 가이드 — Unfallstelle부터 보험신고까지", slug: "german-traffic-accident-response-guide", defaultDesc: "교통사고 시 안전 확보, 증거 기록과 보험사 통지 순서를 정리합니다." },
  { title: "독일 자동차 판매·말소 가이드 — Kaufvertrag와 Abmeldung", slug: "german-car-sale-deregistration-guide", defaultDesc: "차량 판매 또는 운행중지 때 계약, Abmeldung, 세금·보험 처리를 안내합니다." },
];

export default async function DrivingHubPage() {
  const { data: dbGuides } = await supabase
    .from("guides")
    .select("id, slug, title, description, last_verified_at")
    .eq("category", "driving")
    .eq("status", "published")
    .eq("language", "ko")
    .order("published_at", { ascending: false });

  const activeGuides = dbGuides || [];

  function renderTopicList(topics: Topic[]) {
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
    ["🚆 대중교통과 자전거", "ÖPNV & Fahrrad", publicTransportTopics],
    ["🪪 운전면허와 교환", "Führerschein & Umschreibung", licenseTopics],
    ["🚗 차량 구매·등록·관리", "Auto & Zulassung", vehicleTopics],
    ["🛡️ 도로 안전과 마무리", "Sicherheit & Verkauf", safetyTopics],
  ] as const;

  return <main style={{ minHeight: "80vh", padding: "40px 0 80px", background: "#f8fafc" }}><div className="wrapper" style={{ maxWidth: "800px", margin: "0 auto", padding: "0 20px" }}>
    <div style={{ marginBottom: "20px", fontSize: "14px" }}><Link href="/guide" style={{ textDecoration: "none", color: "#64748b" }}>생활정보 가이드</Link><span style={{ color: "#94a3b8", margin: "0 8px" }}>&gt;</span><span style={{ color: "#0f172a", fontWeight: "bold" }}>교통·운전 (Verkehr & Führerschein)</span></div>
    <div style={{ marginBottom: "40px" }}><h1 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: "bold", color: "#0f172a", margin: "0 0 12px", lineHeight: "1.3" }}><span style={{ display: "inline-block" }}>🚗 독일 교통·운전 가이드</span>{" "}<span style={{ display: "inline-block" }}>Verkehr & Führerschein</span></h1><p style={{ fontSize: "15px", color: "#64748b", lineHeight: "1.6", margin: 0 }}>독일 대중교통 이용부터 한국 운전면허, 차량 구매·등록, 도로 규칙과 사고 대응까지 이동 생활의 전체 흐름을 단계별로 확인하세요.</p></div>
    {sections.map(([title, subtitle, topics], index) => <section key={subtitle} style={{ marginBottom: index === sections.length - 1 ? 0 : "40px" }}><h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}><span style={{ display: "inline-block" }}>{title}</span>{" "}<span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>({subtitle})</span></h2>{renderTopicList(topics)}</section>)}
  </div></main>;
}
