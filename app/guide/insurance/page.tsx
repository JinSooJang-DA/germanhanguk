import { SITE_URL } from "@/lib/config";
import React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const metadata = {
  title: "독일 보험 가이드 & 핵심 정보 - GermanHanguk",
  description: "독일 생활의 필수품인 공적 건강보험(GKV), 사적 건강보험(PKV), 개인책임보험, 법률보험 및 자동차보험 등 핵심 보험 가이드와 꿀팁을 모았습니다.",
  alternates: {
    canonical: SITE_URL + "/guide/insurance",
  },
  openGraph: {
    title: "독일 보험 가이드 & 추천 정보 - GermanHanguk",
    description: "독일 건강보험 공보험 vs 사보험 비교 및 개인책임보험 가입 요령 등 독일 정착을 위한 안심 보험 가이드 모음.",
    type: "website",
    url: SITE_URL + "/guide/insurance",
  },
};

export default async function InsuranceHubPage() {
  // DB에서 실제 등록된 보험 가이드 목록 조회
  const { data: dbGuides } = await supabase
    .from("guides")
    .select("id, slug, title, description, last_verified_at")
    .eq("category", "insurance")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const activeGuides = dbGuides || [];

  // 가이드 플레이스홀더 데이터 (풍부한 로드맵 제시)
  const futureHealthTopics = [
    { title: "독일 건강보험 총정리 가이드", isReady: false },
    { title: "독일 공보험(GKV) vs 사보험(PKV) 완벽 비교", isReady: true, slug: "german-health-insurance-guide" },
    { title: "독일 직장인 의무 건강보험 요율 및 가입 팁", isReady: false },
    { title: "독일 유학생 전용 알뜰 공보험 가이드", isReady: false },
    { title: "워킹홀리데이 체류자 전용 안심 사보험", isReady: false },
    { title: "독일 프리랜서 및 예술가(KSK) 건강보험 가입 요령", isReady: false },
    { title: "가족보험 (Familienversicherung) 무상 혜택 자격조건", isReady: false }
  ];

  const futureLifeTopics = [
    { title: "개인책임보험 (Haftpflichtversicherung) 선택이 아닌 필수인 이유", isReady: false },
    { title: "독일 자동차보험 (Kfz-Versicherung) 가입 가이드", isReady: false },
    { title: "독일 법률보험 (Rechtsschutzversicherung) 범위와 요금 비교", isReady: false },
    { title: "독일 가재보험 (Hausratversicherung) 보장 혜택 분석", isReady: false },
    { title: "해외 장기 여행/출장자 필수 여행보험 안내", isReady: false }
  ];

  return (
    <main style={{ minHeight: "80vh", padding: "40px 0 80px", background: "#f8fafc" }}>
      <div className="wrapper" style={{ maxWidth: "800px", margin: "0 auto", padding: "0 20px" }}>
        
        {/* 상단 브레드크럼 */}
        <div style={{ marginBottom: "20px", fontSize: "14px" }}>
          <Link href="/guide" style={{ textDecoration: "none", color: "#64748b" }}>생활정보 가이드</Link>
          <span style={{ color: "#94a3b8", margin: "0 8px" }}>&gt;</span>
          <span style={{ color: "#0f172a", fontWeight: "bold" }}>보험 (Insurance)</span>
        </div>

        {/* 타이틀 헤더 */}
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: "bold", color: "#0f172a", margin: "0 0 12px 0", lineHeight: "1.3" }}>
            <span style={{ display: "inline-block" }}>🏥 독일 정착 필수 보험</span>{" "}
            <span style={{ display: "inline-block" }}>완벽 가이드</span>
          </h1>
          <p style={{ fontSize: "15px", color: "#64748b", lineHeight: "1.6", margin: 0 }}>
            독일에서 생활할 때 보험 가입은 선택이 아닌 의무이자 필수 안전장치입니다. 
            의무 가입 대상인 건강보험부터 실수를 보상하는 책임보험까지 독일 정착의 든든한 뼈대를 세우세요.
          </p>
        </div>

        {/* 건강보험 섹션 */}
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🩺 건강보험</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Krankenversicherung)</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {futureHealthTopics.map(function(topic, i) {
              const matchedDb = activeGuides.find(function(g) { return g.slug === topic.slug; });
              const isPublished = topic.isReady && matchedDb;

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
                    flexWrap: "wrap", // 모바일 대응: 공간 부족 시 자동 줄바꿈
                    gap: "12px",
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ flex: "1 1 300px", minWidth: "260px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: "bold", margin: "0 0 4px 0", color: isPublished ? "#0f172a" : "#64748b", wordBreak: "keep-all" }}>
                      {topic.title}
                    </h3>
                    <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                      {isPublished ? "정식 출간됨 · 마지막 검증일: " + new Date(matchedDb.last_verified_at).toLocaleDateString() : "에디터 집필 중 · 2026 하반기 공개 예정"}
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
        </div>

        {/* 생활보험 섹션 */}
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🛡️ 생활 및 재산 보험</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Allgemeine Versicherungen)</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {futureLifeTopics.map(function(topic, i) {
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
                    flexWrap: "wrap", // 모바일 대응
                    gap: "12px",
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ flex: "1 1 300px", minWidth: "260px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: "bold", margin: "0 0 4px 0", color: "#64748b", wordBreak: "keep-all" }}>
                      {topic.title}
                    </h3>
                    <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                      에디터 집필 중 · 2026 하반기 공개 예정
                    </p>
                  </div>
                  <span style={{ fontSize: "12px", color: "#94a3b8", background: "#f1f5f9", padding: "4px 10px", borderRadius: "4px", fontWeight: "500" }}>
                    준비 중
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </main>
  );
}
