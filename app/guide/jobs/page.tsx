import { SITE_URL } from "@/lib/config";
import React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date";

export const metadata = {
  title: "독일 취업 & 직장생활 가이드 - GermanHanguk",
  description: "독일 구직 준비, Lebenslauf와 Anschreiben, 면접, 근로계약, 수습기간, 급여명세서, 휴가·병가, 해고·실업 및 이직까지 정리한 취업·직장생활 가이드입니다.",
  alternates: {
    canonical: SITE_URL + "/guide/jobs",
  },
  openGraph: {
    title: "독일 취업 & 직장생활 가이드 - GermanHanguk",
    description: "독일 취업 준비부터 Arbeitsvertrag, Probezeit, 직장생활, Kündigung과 이직까지 단계별로 확인하세요.",
    type: "website",
    url: SITE_URL + "/guide/jobs",
  },
};

export default async function JobsHubPage() {
  // DB에서 실제 등록된 취업·직장(Jobs) 카테고리의 한국어 가이드 목록 조회 (N+1 방지 단건 쿼리)
  const { data: dbGuides } = await supabase
    .from("guides")
    .select("id, slug, title, description, last_verified_at")
    .eq("category", "jobs")
    .eq("status", "published")
    .eq("language", "ko")
    .order("published_at", { ascending: false });

  const activeGuides = dbGuides || [];

  const preparationTopics = [
    {
      title: "독일 취업 시작 가이드 — 구직 전략부터 체류자격 확인까지",
      slug: "german-job-search-start-guide",
      defaultDesc: "독일 취업을 시작하기 전에 목표 직무, 언어, 자격 인정, 취업 가능한 체류자격과 준비 순서를 점검합니다.",
    },
    {
      title: "독일식 이력서 가이드 — Lebenslauf 구성과 경력 표현법",
      slug: "german-lebenslauf-cv-guide",
      defaultDesc: "독일 채용 관행에 맞춰 경력, 학력, 언어와 기술을 읽기 쉬운 Lebenslauf로 정리하는 방법을 안내합니다.",
    },
    {
      title: "독일 Anschreiben 가이드 — 지원동기서와 증빙서류 준비",
      slug: "german-anschreiben-certificates-guide",
      defaultDesc: "채용공고에 맞춘 Anschreiben 작성법과 학위·경력증명서, Arbeitszeugnis 등 지원서류 준비 순서를 정리합니다.",
    },
    {
      title: "독일 구직 사이트·지원 전략 가이드 — 공고 찾기부터 지원 관리까지",
      slug: "german-job-platforms-applications-guide",
      defaultDesc: "독일 공식 구직 채널과 기업 채용 페이지를 활용하고, 공고 분석부터 지원 이력 관리까지 체계화하는 방법을 안내합니다.",
    },
  ];

  const applicationTopics = [
    {
      title: "독일 면접 가이드 — Vorstellungsgespräch과 연봉 질문 준비",
      slug: "german-job-interview-guide",
      defaultDesc: "독일 Vorstellungsgespräch의 일반적인 흐름, 경력 질문, 과제, 연봉·입사일 협의와 후속 연락을 준비합니다.",
    },
    {
      title: "독일 근로계약서 가이드 — Arbeitsvertrag와 Befristung 확인",
      slug: "german-employment-contract-guide",
      defaultDesc: "독일 근로계약서에서 직무, 급여, 근무시간, 수습기간, 휴가, 해지기간과 기간제 조항을 확인하는 방법을 정리합니다.",
    },
  ];

  const workingTopics = [
    {
      title: "독일 수습기간 가이드 — Probezeit의 해지기간과 대응",
      slug: "german-probation-period-guide",
      defaultDesc: "Probezeit의 계약 조항, 법정 해지기간, 기간제 계약의 비례 원칙과 수습기간 중 실무 대응을 안내합니다.",
    },
    {
      title: "독일 급여명세서 가이드 — Lohnabrechnung과 사회보험 공제",
      slug: "german-payslip-social-insurance-guide",
      defaultDesc: "독일 급여명세서의 Brutto·Netto, Lohnsteuer와 건강·연금·실업·요양보험 공제 항목을 읽는 방법을 안내합니다.",
    },
    {
      title: "독일 근무시간·휴가 가이드 — Arbeitszeit, 휴식과 Mindesturlaub",
      slug: "german-working-hours-vacation-guide",
      defaultDesc: "독일의 법정 근무시간, 휴게·휴식시간, 초과근무 기록과 최소 유급휴가의 기본 원칙을 정리합니다.",
    },
    {
      title: "독일 병가 가이드 — Krankmeldung, AU와 급여 계속 지급",
      slug: "german-sick-leave-guide",
      defaultDesc: "아플 때 회사에 즉시 알리는 방법, AU·eAU 절차와 Entgeltfortzahlung 및 Krankengeld의 기본 흐름을 안내합니다.",
    },
  ];

  const transitionTopics = [
    {
      title: "독일 직장 문제 해결 가이드 — 차별, 괴롭힘과 임금 문제 대응",
      slug: "german-workplace-problems-guide",
      defaultDesc: "직장 내 차별·괴롭힘·임금 또는 근무시간 문제가 생겼을 때 기록, 내부 신고와 외부 상담 순서를 안내합니다.",
    },
    {
      title: "독일 해고·퇴사 가이드 — Kündigung과 즉시 확인할 기한",
      slug: "german-termination-resignation-guide",
      defaultDesc: "해고 통지를 받거나 자진퇴사할 때 서면 형식, Kündigungsfrist, 3주 소송 기한과 Arbeitszeugnis를 확인합니다.",
    },
    {
      title: "독일 실업 가이드 — Arbeitsuchendmeldung, Arbeitslosmeldung과 ALG",
      slug: "german-unemployment-registration-guide",
      defaultDesc: "고용 종료 전 구직신고, 실업 첫날의 실업신고, Arbeitslosengeld 신청과 Sperrzeit 기본 절차를 안내합니다.",
    },
    {
      title: "독일 이직 가이드 — 새 계약, 퇴사와 체류허가 변경 확인",
      slug: "german-job-change-guide",
      defaultDesc: "독일에서 이직할 때 새 근로계약 확인, 기존 계약 해지, 휴가·서류 정산과 취업 체류허가 변경 절차를 정리합니다.",
    },
  ];

  function renderTopicList(topics: typeof preparationTopics) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {topics.map(function (topic, i) {
          const matchedDb = activeGuides.find(function (guide) { return guide.slug === topic.slug; });
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
                <h3 style={{ fontSize: "15px", fontWeight: "bold", margin: "0 0 6px 0", color: isPublished ? "#0f172a" : "#64748b", wordBreak: "keep-all" }}>
                  {isPublished ? matchedDb.title : topic.title}
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5", margin: "0 0 6px 0", wordBreak: "keep-all" }}>
                  {isPublished ? matchedDb.description : topic.defaultDesc}
                </p>
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
    <main style={{ minHeight: "80vh", padding: "40px 0 80px", background: "#f8fafc" }}>
      <div className="wrapper" style={{ maxWidth: "800px", margin: "0 auto", padding: "0 20px" }}>
        <div style={{ marginBottom: "20px", fontSize: "14px" }}>
          <Link href="/guide" style={{ textDecoration: "none", color: "#64748b" }}>생활정보 가이드</Link>
          <span style={{ color: "#94a3b8", margin: "0 8px" }}>&gt;</span>
          <span style={{ color: "#0f172a", fontWeight: "bold" }}>취업·직장 (Arbeit & Beruf)</span>
        </div>

        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: "bold", color: "#0f172a", margin: "0 0 12px 0", lineHeight: "1.3" }}>
            <span style={{ display: "inline-block" }}>💼 독일 취업·직장생활 가이드</span>{" "}
            <span style={{ display: "inline-block" }}>Arbeit & Beruf</span>
          </h1>
          <p style={{ fontSize: "15px", color: "#64748b", lineHeight: "1.6", margin: 0 }}>
            독일 취업 준비부터 지원·면접, 근로계약과 직장생활, 퇴사·실업·이직까지 이어지는 전체 흐름을 단계별로 확인하세요.
            한국인이 실제로 준비하고 행동해야 할 핵심 절차와 독일어 용어를 한곳에 정리했습니다.
          </p>
        </div>

        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🧭 구직 준비와 지원서</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Jobsuche & Bewerbung)</span>
          </h2>
          {renderTopicList(preparationTopics)}
        </div>

        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🤝 면접과 근로계약</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Vorstellungsgespräch & Arbeitsvertrag)</span>
          </h2>
          {renderTopicList(applicationTopics)}
        </div>

        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🏢 입사와 직장생활</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Berufsalltag)</span>
          </h2>
          {renderTopicList(workingTopics)}
        </div>

        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🔄 문제 대응·퇴사·이직</span>{" "}
            <span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Konflikte & Wechsel)</span>
          </h2>
          {renderTopicList(transitionTopics)}
        </div>
      </div>
    </main>
  );
}
