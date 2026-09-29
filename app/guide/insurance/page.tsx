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
  // DB에서 실제 등록된 보험 가이드 목록 조회 (N+1 방지 단건 조인 쿼리)
  const { data: dbGuides } = await supabase
    .from("guides")
    .select("id, slug, title, description, last_verified_at")
    .eq("category", "insurance")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const activeGuides = dbGuides || [];

  // 독일 공인 보건부(BMG) 및 사회보험 기준 법령 9대 건강보험 가이드 구조체 매핑
  const healthTopics = [
    { 
      title: "독일 공보험(GKV) vs 사보험(PKV) 완벽 비교 선택 가이드", 
      slug: "german-health-insurance-guide", 
      defaultDesc: "독일 법정 공보험(GKV)과 민간 사보험(PKV)의 핵심 차이점, 나이 및 소득 조건별 선택 노하우 가이드." 
    },
    { 
      title: "독일 직장인 건강보험 가이드 — GKV 가입부터 보험료까지", 
      slug: "german-employee-health-insurance-guide", 
      defaultDesc: "직장인 의무가입 소득 한계선(JAEG)과 2026년 건강보험료율, 고용주 부담 비율 및 가입 단계 총정리." 
    },
    { 
      title: "독일 유학생 건강보험 가이드 — 공보험 자격과 가입 요령", 
      slug: "german-student-health-insurance-guide", 
      defaultDesc: "유학생의 나이와 등록 조건에 따른 최적의 공보험 가입 노하우." 
    },
    { 
      title: "독일 프리랜서·자영업자 건강보험 및 예술가사회보장(KSK) 가이드", 
      slug: "german-self-employed-health-insurance-guide", 
      defaultDesc: "예술인 사회보장제도(KSK) 지원 자격과 자영업자 공보험 자발적 가입 기준 및 사보험 계약 팁." 
    },
    { 
      title: "가족보험 (Familienversicherung) 무상 등재 자격 조건", 
      slug: "german-family-health-insurance-guide", 
      defaultDesc: "추가 보험료 없이 배우자와 자녀를 자신의 공보험 밑으로 올려 동반 혜택을 누릴 수 있는 자격 가이드." 
    },
    { 
      title: "Krankenkasse 공보험사 선택 및 변경 매뉴얼", 
      slug: "german-krankenkasse-selection-change-guide", 
      defaultDesc: "독일 공보험사(AOK, TK, BARMER 등) 혜택 차이, 추가 요율(Zusatzbeitrag) 비교 및 보험사 이동 법적 가이드." 
    },
    { 
      title: "건강보험료 상한선 BBG 및 의무가입 소득 한계선 JAEG 기준 안내", 
      slug: "german-health-insurance-contribution-guide", 
      defaultDesc: "2026년 사회보험 산정 한계선 BBG와 가입 의무가 면제되는 고소득 직장인 JAEG 기준값 상세 분석." 
    },
    { 
      title: "독일 사보험(PKV) 계약 요건과 나이대별 요금 가이드", 
      slug: "german-private-health-insurance-pkv-guide", 
      defaultDesc: "사보험 계약 시의 보장 범위 조정법, 가입 연령에 따른 인상 위험성 및 장기적인 유지 요령." 
    },
    { 
      title: "퇴사·실직·직업 변경 시 독일 건강보험 대처 가이드", 
      slug: "german-unemployment-health-insurance-guide", 
      defaultDesc: "직장을 그만두거나 휴직 시 공보험 자발적 가입 유지법, 그리고 연방고용청(Agentur für Arbeit)의 보험료 지원 조건." 
    }
  ];

  // 기타 생활 및 재산 보험 가이드 구조체 매핑 (14개 통합형 데이터 구조 완벽 확장)
  const futureLifeTopics = [
    { 
      title: "개인책임보험 (Haftpflichtversicherung) 선택이 아닌 필수인 이유", 
      slug: "german-private-liability-insurance-guide",
      defaultDesc: "독일 생활의 최대 실수 보상 안전망, 남에게 가한 물적/인적 손해 배상 보험 가입 팁." 
    },
    { 
      title: "독일 자동차보험 (Kfz-Versicherung) 가입 및 보장 단계 가이드", 
      slug: "german-car-insurance-guide",
      defaultDesc: "독일 차량 취득 시 의무 가입 항목, 사고 보장 단계(Haftpflicht, Teilkasko, Vollkasko) 가이드." 
    },
    { 
      title: "독일 법률보험 (Rechtsschutzversicherung) 범위와 분쟁 대처법", 
      slug: "german-legal-expenses-insurance-guide",
      defaultDesc: "임대차 분쟁, 노동계약 갈등 시의 변호사 및 법정 소송 비용 보장 분석." 
    },
    { 
      title: "독일 가재보험 (Hausratversicherung) 가입과 도난 보장 가이드", 
      slug: "german-household-contents-insurance-guide",
      defaultDesc: "아파트 침수, 화재, 자전거 도난 시 가재도구 보장을 위한 보험 가이드." 
    },
    { 
      title: "해외 장기 여행/어학 연수 전용 안심 여행보험 요약", 
      slug: "german-travel-insurance-guide",
      defaultDesc: "독일 입국 및 한국 방문 시 유효한 단기 및 중장기 해외 체류 여행자 전용 안심 보험." 
    }
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
            {healthTopics.map(function(topic, i) {
              const matchedDb = activeGuides.find(function(g) { return g.slug === topic.slug; });
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
                    flexWrap: "wrap", // 모바일 대응
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
        </div>

        {/* 생활보험 섹션 */}
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🛡️ 생활 및 재산 보험</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Allgemeine Versicherungen)</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {futureLifeTopics.map(function(topic, i) {
              const matchedDb = activeGuides.find(function(g) { return g.slug === topic.slug; });
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
                    flexWrap: "wrap", // 모바일 대응
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
        </div>

      </div>
    </main>
  );
}
