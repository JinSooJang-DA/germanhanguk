import { SITE_URL } from "@/lib/config";
import React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date";

export const metadata = {
  title: "독일 집 구하기 & 주거 생활 가이드 - GermanHanguk",
  description: "독일에서 집 구하기(Wohnungssuche), 보증금(Mietkaution)과 안멜둥(Anmeldung), 월세 구성(Nebenkosten), 계약서 분쟁과 퇴거(Kündigung)까지 총정리한 공식 주거 생활 가이드입니다.",
  alternates: {
    canonical: SITE_URL + "/guide/housing",
  },
  openGraph: {
    title: "독일 집 구하기 & 주거 생활 가이드 - GermanHanguk",
    description: "독일 보증금 돌려받기, 곰팡이 Mietminderung, 중도 퇴거 Nachmieter 등 독일 안심 정착을 위한 필수 주거 가이드 총정리.",
    type: "website",
    url: SITE_URL + "/guide/housing",
  },
};

export default async function HousingHubPage() {
  // DB에서 실제 등록된 주거(Wohnen) 카테고리의 가이드 목록 조회 (N+1 방지 단건 쿼리)
  const { data: dbGuides } = await supabase
    .from("guides")
    .select("id, slug, title, description, last_verified_at")
    .eq("category", "housing")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const activeGuides = dbGuides || [];

  // 14개 주거 가이드 라이프사이클 그룹 정의
  const huntTopics = [
    {
      title: "독일 방 구하기와 보눙 매물 검색 가이드 (Wohnungssuche)",
      slug: "german-housing-search-guide",
      defaultDesc: "Immobilienscout24, WG-Gesucht 등 현지 주요 플랫폼 탐색 및 모바일 매물 알림 꿀팁."
    },
    {
      title: "WG, 보눙, 쯔비셴 가이드 (WG·Wohnung·Zwischenmiete)",
      slug: "german-wg-wohnung-sublet-guide",
      defaultDesc: "독일 공동거주 플랫(WG)의 형태, 임시 서블렛 계약 주의사항 및 보증금 보장 팁."
    },
    {
      title: "독일 월세의 이해: Kaltmiete, Warmmiete, Nebenkosten 완벽 분석",
      slug: "german-rent-costs-guide",
      defaultDesc: "순수 월세와 관리비 정산, 수도/난방 등 가구별 관리비 구성 요율 가이드."
    },
    {
      title: "집 지원 서류 총정리: SCHUFA, Gehaltsnachweis, Selbstauskunft",
      slug: "german-rental-application-documents-guide",
      defaultDesc: "독일 임대업자가 필수 요구하는 신용 등급 보증서와 재직 증명, 자기소개서 완벽 준비서."
    },
    {
      title: "집주인을 사로잡는 보눙 지원 메시지 작성법 (Wohnungsbewerbung)",
      slug: "german-rental-application-message-guide",
      defaultDesc: "경쟁률 높은 매물에 첫 눈에 드는 정중한 독일어/영어 지원 자기소개 템플릿."
    }
  ];

  const contractTopics = [
    {
      title: "독일 주택 임대차 계약서 조항 완전 분석 (Mietvertrag)",
      slug: "german-rental-contract-guide",
      defaultDesc: "계약 기간 설정, 반려동물 조항, 월세 인상(Staffelmiete) 등 서명 전 필수 확인 독소조항."
    },
    {
      title: "독일 월세 보증금 예치와 보증 조건 가이드 (Mietkaution)",
      slug: "german-rental-deposit-guide",
      defaultDesc: "최대 3개월치 월세 한도 보증금(Mietkaution)의 안전한 은행 예치(Kautionskonto) 및 분할 납부 규정."
    },
    {
      title: "전입신고 안멜둥과 집주인 확인서 취득 가이드 (Anmeldung)",
      slug: "german-anmeldung-housing-guide",
      defaultDesc: "독일 행정의 시작! 거주지 등록 안멜둥 서류와 집주인 확인서(Wohnungsgeberbestätigung) 서식 확인."
    },
    {
      title: "입주 시 필수 작성하는 Übergabeprotokoll 열쇠 및 손상 점검",
      slug: "german-move-in-handover-guide",
      defaultDesc: "퇴거 시 원상복구 분쟁을 방어하는 입주 시점 파손 이력, 계량기(난방/온수) 기록 대조법."
    }
  ];

  const livingTopics = [
    {
      title: "독일 연말 관리비 정산 대응 가이드 (Nebenkostenabrechnung)",
      slug: "german-nebenkosten-statement-guide",
      defaultDesc: "매년 발생하는 관리비 추가 정산 고지서의 항목별 합법성 검증 및 과다 청구 대응 가이드."
    },
    {
      title: "보눙 결함과 곰팡이 대처 및 월세 감액 가이드 (Mietminderung)",
      slug: "german-rental-defects-mold-guide",
      defaultDesc: "독일 겨울철 환기 요령, 곰팡이 발생 시 집주인 하자 수리 통보 및 합법적 월세 감액(Mietminderung) 비율."
    }
  ];

  const exitTopics = [
    {
      title: "독일 아파트 해지 고지와 해지 기간 규정 (Kündigung)",
      slug: "german-rental-termination-guide",
      defaultDesc: "일반적으로 3개월 전에 통보해야 하는 법적 해지 기간(Kündigungsfrist)과 서면 해지 통지서 서식."
    },
    {
      title: "후임 세입자 구하기와 중도 퇴거 협상 가이드 (Nachmieter)",
      slug: "german-nachmieter-early-moveout-guide",
      defaultDesc: "계약 기간 도중 한국 귀국 등으로 조기 퇴거 시 후임자(Nachmieter) 추천권과 집주인 설득 방법."
    },
    {
      title: "퇴거 후 보증금 반환 기한 및 전액 반환 팁 (Kautionsrückzahlung)",
      slug: "german-rental-deposit-return-guide",
      defaultDesc: "집주인의 합법적 보증금 홀딩 기간과 연간 관리비 정산 보류 한도, 그리고 분쟁 시 대응 요령."
    }
  ];

  function renderTopicList(topics: typeof huntTopics) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {topics.map(function(topic, i) {
          const matchedDb = activeGuides.find(function(g) { return g.slug === topic.slug; });
          const isPublished = !!matchedDb;

          return (
            <div
              key={i}
              style={{
                background: "var(--gh-card-surface)",
                border: "2px solid var(--gh-card-border)",
                borderRadius: "0",
                boxShadow: "var(--gh-card-shadow)",
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
                    ? "정식 가이드 게시됨 · 마지막 검증일: " + formatDate(matchedDb.last_verified_at)
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
    <main style={{ minHeight: "80vh", padding: "40px 0 80px", background: "var(--gh-page-bg)" }}>
      <div className="wrapper" style={{ maxWidth: "800px", margin: "0 auto", padding: "0 20px" }}>

        {/* 상단 브레드크럼 */}
        <div style={{ marginBottom: "20px", fontSize: "14px" }}>
          <Link href="/guide" style={{ textDecoration: "none", color: "#64748b" }}>생활정보 가이드</Link>
          <span style={{ color: "#94a3b8", margin: "0 8px" }}>&gt;</span>
          <span style={{ color: "#0f172a", fontWeight: "bold" }}>집·이사 (Wohnen)</span>
        </div>

        {/* 타이틀 헤더 */}
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: "bold", color: "#0f172a", margin: "0 0 12px 0", lineHeight: "1.3" }}>
            <span style={{ display: "inline-block" }}>🏠 독일 주거 생활 가이드</span>{" "}
            <span style={{ display: "inline-block" }}>Wohnen 안내서</span>
          </h1>
          <p style={{ fontSize: "15px", color: "#64748b", lineHeight: "1.6", margin: 0 }}>
            독일에서 성공적인 안착을 결정짓는 가장 중요한 관문인 보눙 구하기와 이사 절차입니다.
            매물 탐색부터 보증금 전액 반환까지, 세입자의 권리를 지키는 법적 핵심 지식들을 단계별 가이드로 확인하세요.
          </p>
        </div>

        {/* 1. 집 찾기와 지원 */}
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🔍 집 찾기와 지원</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Wohnungssuche & Bewerbung)</span>
          </h2>
          {renderTopicList(huntTopics)}
        </div>

        {/* 2. 계약과 입주 */}
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>✍️ 계약과 입주</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Mietvertrag & Einzug)</span>
          </h2>
          {renderTopicList(contractTopics)}
        </div>

        {/* 3. 거주 중 문제 */}
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🛠️ 거주 중 문제 대처</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Mangel & Mietminderung)</span>
          </h2>
          {renderTopicList(livingTopics)}
        </div>

        {/* 4. 이사와 퇴거 */}
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🚪 이사와 퇴거</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Kündigung & Auszug)</span>
          </h2>
          {renderTopicList(exitTopics)}
        </div>

      </div>
    </main>
  );
}
