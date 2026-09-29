import { SITE_URL } from "@/lib/config";
import React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const metadata = {
  title: "독일 세금 & 연말정산 가이드 - GermanHanguk",
  description: "독일 세금번호(Steuer-ID), 세금등급(Steuerklasse), 급여명세서, 소득세 신고(Steuererklärung), 환급 및 프리랜서 세금까지 정리한 독일 세금 생활 가이드입니다.",
  alternates: {
    canonical: SITE_URL + "/guide/taxes",
  },
  openGraph: {
    title: "독일 세금 & 연말정산 가이드 - GermanHanguk",
    description: "독일 세금등급, 연말정산 환급, ELSTER 세금 신고와 프리랜서 부가세까지 독일 생활에 필요한 세금 정보를 확인하세요.",
    type: "website",
    url: SITE_URL + "/guide/taxes",
  },
};

export default async function TaxesHubPage() {
  // DB에서 실제 등록된 세금(Steuern) 카테고리의 가이드 목록 조회 (N+1 방지 단건 쿼리)
  const { data: dbGuides } = await supabase
    .from("guides")
    .select("id, slug, title, description, last_verified_at")
    .eq("category", "tax")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const activeGuides = dbGuides || [];

  const basicsTopics = [
    {
      title: "독일 세금 완전 가이드 — Steuer, Finanzamt, Steuer-ID",
      slug: "german-tax-overview-guide",
      defaultDesc: "세금 식별번호와 세무번호의 차이, 관할 세무서(Finanzamt) 및 독일 세금의 기본 구조를 안내합니다.",
    },
    {
      title: "독일 세금등급(Steuerklasse) 1~6 완벽 가이드",
      slug: "german-tax-class-guide",
      defaultDesc: "직장인·부부·복수 직장 근로자의 세금등급 선택 기준과 변경 절차를 정리합니다.",
    },
    {
      title: "독일 부부 세금등급 — IV/IV, III/V, Faktorverfahren",
      slug: "german-married-tax-class-guide",
      defaultDesc: "부부의 소득 상황에 따른 세금등급 조합과 Faktorverfahren 선택 기준을 안내합니다.",
    },
  ];

  const employeeTopics = [
    {
      title: "독일 세금신고 가이드 — Steuererklärung 처음부터 제출까지",
      slug: "german-tax-return-guide",
      defaultDesc: "세금 신고가 의무인 경우와 자발적 신고로 환급을 받을 수 있는 경우를 알아봅니다.",
    },
    {
      title: "독일 세금신고 의무·마감일 — Pflichtveranlagung과 Frist",
      slug: "german-tax-return-obligation-deadline-guide",
      defaultDesc: "독일 세무 당국의 ELSTER를 이용한 온라인 세금 신고 절차와 준비 서류를 안내합니다.",
    },
    {
      title: "독일 직장인 세금공제 — Werbungskosten",
      slug: "german-work-expenses-tax-guide",
      defaultDesc: "Werbungskosten을 중심으로 직장인이 신고할 수 있는 대표적인 비용 공제 항목을 정리합니다.",
    },
    {
      title: "독일 출퇴근 세금공제 — Entfernungspauschale",
      slug: "german-commuting-tax-guide",
      defaultDesc: "직장과 집 사이 이동 거리의 세금공제 기준과 신고 방법을 설명합니다.",
    },
  ];

  const selfEmployedTopics = [
    {
      title: "독일 홈오피스 세금공제 — Homeoffice-Tagespauschale",
      slug: "german-home-office-tax-guide",
      defaultDesc: "재택근무일에 적용되는 Homeoffice-Tagespauschale 공제 조건을 안내합니다.",
    },
    {
      title: "독일 Sonderausgaben 가이드 — 보험·연금",
      slug: "german-special-expenses-tax-guide",
      defaultDesc: "보험료와 연금 납입액 등 Sonderausgaben으로 공제 가능한 비용을 정리합니다.",
    },
    {
      title: "독일 가사·수리비 세금공제 — §35a EStG",
      slug: "german-household-services-tax-guide",
      defaultDesc: "가사 서비스와 주택 수리비에 적용되는 §35a EStG 공제 기준을 안내합니다.",
    },
  ];

  const lifeEventTopics = [
    {
      title: "독일 투자·이자 세금 — Kapitalertragsteuer",
      slug: "german-capital-income-tax-guide",
      defaultDesc: "이자와 투자 수익에 적용되는 Kapitalertragsteuer의 기본을 설명합니다.",
    },
    {
      title: "독일 Steuerbescheid 가이드 — 세금결정통지서",
      slug: "german-tax-assessment-guide",
      defaultDesc: "세무서의 세금결정통지서를 읽고 이의 제기 여부를 판단하는 방법을 안내합니다.",
    },
    {
      title: "독일 ELSTER 사용 가이드",
      slug: "german-elster-guide",
      defaultDesc: "독일 세무 당국의 ELSTER를 이용한 온라인 세금 신고 절차를 안내합니다.",
    },
    {
      title: "독일 거주자의 해외소득 세금 — unbeschränkte Steuerpflicht",
      slug: "german-expat-tax-residency-guide",
      defaultDesc: "독일 세법상 거주자의 해외소득 과세 원칙과 신고 시 유의사항을 정리합니다.",
    },
  ];

  function renderTopicList(topics: typeof basicsTopics) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {topics.map(function (topic, i) {
          const matchedDb = activeGuides.find(function (g) { return g.slug === topic.slug; });
          const isPublished = !!matchedDb;

          return (
            <div
              key={i}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                boxSizing: "border-box",
              }}
            >
              <div style={{ flex: "1 1 300px", minWidth: "260px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "bold", margin: "0 0 4px 0", color: isPublished ? "#0f172a" : "#64748b", wordBreak: "keep-all" }}>
                  {isPublished ? matchedDb.title : topic.title}
                </h3>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                  {isPublished
                    ? "정식 가이드 게시됨 · 마지막 검증일: " + new Date(matchedDb.last_verified_at).toLocaleDateString()
                    : "에디터 집필 중 · 2026 하반기 공개 예정"}
                </p>
              </div>

              {isPublished ? (
                <Link href={"/guide/" + matchedDb.slug} style={{ textDecoration: "none" }}>
                  <button style={{ padding: "6px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}>
                    가이드 읽기
                  </button>
                </Link>
              ) : (
                <span style={{ fontSize: "12px", color: "#94a3b8", background: "#f1f5f9", padding: "4px 10px", borderRadius: "4px", fontWeight: "500" }}>
                  준비 중
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <main style={{ minHeight: "80vh", padding: "40px 0 80px", background: "#f8fafc" }}>
      <div className="wrapper" style={{ maxWidth: "800px", margin: "0 auto", padding: "0 20px" }}>
        <div style={{ marginBottom: "20px", fontSize: "14px" }}>
          <Link href="/guide" style={{ textDecoration: "none", color: "#64748b" }}>생활정보 가이드</Link>
          <span style={{ color: "#94a3b8", margin: "0 8px" }}>&gt;</span>
          <span style={{ color: "#0f172a", fontWeight: "bold" }}>세금 (Steuern)</span>
        </div>

        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: "bold", color: "#0f172a", margin: "0 0 12px 0", lineHeight: "1.3" }}>
            <span style={{ display: "inline-block" }}>💶 독일 세금 가이드</span>{" "}
            <span style={{ display: "inline-block" }}>Steuern 안내서</span>
          </h1>
          <p style={{ fontSize: "15px", color: "#64748b", lineHeight: "1.6", margin: 0 }}>
            독일에서 일하고 생활할 때 꼭 알아야 할 세금의 기본부터 연말정산, 프리랜서 세금 신고까지 단계별로 확인하세요.
            세금등급과 공제 항목을 이해하면 불필요한 혼란을 줄이고 환급 기회도 놓치지 않을 수 있습니다.
          </p>
        </div>

        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🧾 세금의 기본</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Grundlagen)</span>
          </h2>
          {renderTopicList(basicsTopics)}
        </div>

        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>💼 직장인 세금과 연말정산</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Lohnsteuer & Steuererklärung)</span>
          </h2>
          {renderTopicList(employeeTopics)}
        </div>

        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🧑‍💻 프리랜서·자영업자</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Freiberuflich & Selbstständig)</span>
          </h2>
          {renderTopicList(selfEmployedTopics)}
        </div>

        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🔄 생활 변화와 신고 일정</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Fristen & Lebenssituationen)</span>
          </h2>
          {renderTopicList(lifeEventTopics)}
        </div>
      </div>
    </main>
  );
}
