import { SITE_URL } from "@/lib/config";
import React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date";

export const metadata = {
  title: "독일 비자 & 체류허가 완전 가이드 - GermanHanguk",
  description: "독일 비자 신청 절차, 유학 비자, 전문인력 취업비자(Fachkraft), EU Blue Card, 기회카드(Chancenkarte), 비자 연장/이직/실직 및 동반비자, 독일 영주권 신청까지 총정리한 공식 체류 가이드입니다.",
  alternates: {
    canonical: SITE_URL + "/guide/visa-residence",
  },
  openGraph: {
    title: "독일 비자 & 체류허가 완전 가이드 - GermanHanguk",
    description: "독일 기회카드, EU 블루카드, 독일 영주권 취득 요건, 이직/실직 시 비자 변경 등 독일 합법 체류를 위한 비자 가이드 총정리.",
    type: "website",
    url: SITE_URL + "/guide/visa-residence",
  },
};

export default async function VisaHubPage() {
  // DB에서 실제 등록된 비자·체류(visa-residence) 카테고리의 가이드 목록 조회 (N+1 방지 단건 쿼리)
  const { data: dbGuides } = await supabase
    .from("guides")
    .select("id, slug, title, description, last_verified_at")
    .eq("category", "visa-residence")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const activeGuides = dbGuides || [];

  // 14대 비자·체류 가이드 흐름별 구조체 매핑
  const startTopics = [
    {
      title: "독일 비자 및 체류허가(Aufenthaltstitel) 법적 유형 전체 개요",
      slug: "german-visa-residence-overview-guide",
      defaultDesc: "단기 무비자 체류와 장기 체류허가의 차이, 그리고 독일 체류 자격별 핵심 조항 요약."
    },
    {
      title: "독일 대사관 비자 신청 및 현지 외국인관청 테어민 절차",
      slug: "german-visa-application-process-guide",
      defaultDesc: "한국 내 독일 대사관 신청 절차, 현지 안멜둥 후 관청 예약(Termin) 및 신청 요령."
    }
  ];

  const studySearchTopics = [
    {
      title: "독일 대학/대학원 유학생 체류허가 취득 및 유의사항",
      slug: "german-student-residence-permit-guide",
      defaultDesc: "대학 등록 학생 비자의 재정 보증(Blockpit), 만료 기간, 학업 중 파트타임 아르바이트 허용 법적 범위."
    },
    {
      title: "독일 대학 졸업생 대상 18개월 구직 체류 가이드",
      slug: "german-post-graduation-job-search-guide",
      defaultDesc: "독일 대학 졸업 후 현지 취업을 위한 구직 비자 연장 방법, 생활비 증명 및 풀타임 근로 조건."
    },
    {
      title: "독일 기회카드 (Chancenkarte) 발급 조건 및 포인트제 정리",
      slug: "german-opportunity-card-guide",
      defaultDesc: "2024 신설 구직 제도! 점수제 기회카드 신청 자격, 포인트 산정표 및 현지 파트타임 구직 혜택."
    }
  ];

  const workTopics = [
    {
      title: "독일 전문인력 취업비자 가이드 (Fachkraft §18a/§18b)",
      slug: "german-skilled-worker-residence-guide",
      defaultDesc: "직업 교육 수료자(§18a) 및 대학 졸업자(§18b) 취업비자 신청 요건, 노동청(ZAV) 사전 승인 절차."
    },
    {
      title: "독일 EU 블루카드 (EU Blue Card) 완벽 정리",
      slug: "german-eu-blue-card-guide",
      defaultDesc: "IT 및 일반 전문직 소득 한계선 기준값, 연금 납부 기간 단축 혜택 및 동반 가족 비자 신속 허용 요건."
    },
    {
      title: "외국 학위 및 직업 자격 독일 공식 아날케눙(Anerkennung) 가이드",
      slug: "german-qualification-recognition-residence-guide",
      defaultDesc: "취업비자 신청의 필수 전제조건! 아나빈(Anabin) 대학 동등성 증명 및 전문 자격 인정 신청 방법."
    }
  ];

  const changeTopics = [
    {
      title: "체류허가 만료 전 연장 신청(Fiktionsbescheinigung) 매뉴얼",
      slug: "german-residence-permit-renewal-guide",
      defaultDesc: "외국인관청 테어민 지연 시 합법적인 임시 체류를 보장하는 임시증명서 발급 및 해외 출입국 규정."
    },
    {
      title: "이직 및 직장 변경 시 비자 정보 업데이트 가이드",
      slug: "german-job-change-residence-permit-guide",
      defaultDesc: "비자 발급 후 2년 이내 이직 시 외국인청/노동청 고용 변경 승인 및 비자 묶음 조항 해결 팁."
    },
    {
      title: "권고사직·해고 등 실직 시 비자 상실 방지 대처법",
      slug: "german-job-loss-residence-permit-guide",
      defaultDesc: "실직 즉시 외국인관청 신고 의무 기간, 구직 기간 확보 요령 및 실직수당(ALG I)과 비자 권한의 관계."
    }
  ];

  const longTopics = [
    {
      title: "독일 동반비자 및 가족 결합 체류 가이드 (Familiennachzug)",
      slug: "german-family-reunification-guide",
      defaultDesc: "배우자 및 미성년 자녀 초청 요건, 면적/소득 기준 및 배우자 어학 성적(A1) 증명 의무 면제 조건."
    },
    {
      title: "독일 일반 영주권 (Niederlassungserlaubnis) 자격 요건",
      slug: "german-permanent-residence-guide",
      defaultDesc: "독일 장기 거주자를 위한 무기한 영주권 자격, 연금 납부 60개월 의무 및 어학(B1), 생활 정치 시험(LiD) 기준."
    },
    {
      title: "전문인력 및 EU 블루카드 소지자 초고속 영주권 취득 가이드",
      slug: "german-permanent-residence-skilled-workers-guide",
      defaultDesc: "Fachkraft 취업비자 소지자(21개월/36개월 연금 기준) 및 블루카드 소지자(21개월/27개월) 영주권 우대 혜택."
    }
  ];

  function renderTopicList(topics: typeof startTopics) {
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
          <span style={{ color: "#0f172a", fontWeight: "bold" }}>비자·체류 (Visa)</span>
        </div>

        {/* 타이틀 헤더 */}
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: "bold", color: "#0f172a", margin: "0 0 12px 0", lineHeight: "1.3" }}>
            <span style={{ display: "inline-block" }}>🇩🇪 독일 비자 & 체류가이드</span>{" "}
            <span style={{ display: "inline-block" }}>Aufenthaltstitel</span>
          </h1>
          <p style={{ fontSize: "15px", color: "#64748b", lineHeight: "1.6", margin: 0 }}>
            독일에서 합법적으로 거주하고 정착하기 위해 가장 기초가 되는 행정의 시작과 끝, 바로 체류 신분(Status) 설계입니다.
            유학 비자부터 전문인력 취업비자, 초고속 영주권과 영구 장기 정착을 위한 법률 가이드를 한눈에 단계별로 탐색하세요.
          </p>
        </div>

        {/* 1. 처음 시작하기 */}
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>📄 처음 시작하기</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Getting Started)</span>
          </h2>
          {renderTopicList(startTopics)}
        </div>

        {/* 2. 유학·구직 */}
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🎓 유학 및 구직</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Study & Job Hunt)</span>
          </h2>
          {renderTopicList(studySearchTopics)}
        </div>

        {/* 3. 독일 취업 */}
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>💼 독일 취업 비자</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Skilled Workers & Blue Card)</span>
          </h2>
          {renderTopicList(workTopics)}
        </div>

        {/* 4. 독일 생활 중 체류 변경 */}
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🔄 체류 변경 및 대처</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Stay Changes & Crisis)</span>
          </h2>
          {renderTopicList(changeTopics)}
        </div>

        {/* 5. 가족·장기 정착 */}
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🏠 가족 결합 & 영주권</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Family & Settlement)</span>
          </h2>
          {renderTopicList(longTopics)}
        </div>

      </div>
    </main>
  );
}
