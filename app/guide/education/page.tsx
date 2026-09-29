import { SITE_URL } from "@/lib/config";
import React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const metadata = {
  title: "독일 유학·교육 가이드 - GermanHanguk",
  description: "독일 유학 경로 선택, 대학·전공 검색, 입학요건, 지원서류, 등록, 유학생 근로와 졸업 후 전환까지 정리한 유학·교육 가이드입니다.",
  alternates: {
    canonical: SITE_URL + "/guide/education",
  },
  openGraph: {
    title: "독일 유학·교육 가이드 - GermanHanguk",
    description: "독일 대학·Ausbildung 준비부터 지원, 등록, 재학과 졸업 후 전환까지 단계별로 확인하세요.",
    type: "website",
    url: SITE_URL + "/guide/education",
  },
};

export default async function EducationHubPage() {
  const { data: dbGuides } = await supabase
    .from("guides")
    .select("id, slug, title, description, last_verified_at")
    .eq("category", "education")
    .eq("status", "published")
    .eq("language", "ko")
    .order("published_at", { ascending: false });

  const activeGuides = dbGuides || [];

  const preparationTopics = [
    { title: "독일 유학 경로 선택 가이드 — Universität, Hochschule, Ausbildung 비교", slug: "german-study-pathways-guide", defaultDesc: "독일의 Universität, Hochschule/FH, duales Studium과 Ausbildung을 비교하고 학업·취업 목표에 맞는 진로를 고르는 방법을 안내합니다." },
    { title: "독일 대학·전공 찾기 가이드 — Hochschulkompass와 DAAD 활용", slug: "german-university-program-search-guide", defaultDesc: "공식 검색 도구로 독일 대학과 전공을 찾고 학위, 수업 언어, 입학 제한과 지원 경로를 비교하는 방법을 정리합니다." },
    { title: "한국 학력으로 독일 대학 지원하기 — Hochschulzugangsberechtigung 확인", slug: "german-korean-qualification-university-admission-guide", defaultDesc: "한국 고교·수능·대학 학력이 독일의 Hochschulzugangsberechtigung으로 어떻게 검토되는지와 확인 순서를 안내합니다." },
    { title: "독일 Ausbildung 가이드 — 이원·학교형 직업교육과 지원 준비", slug: "german-ausbildung-pathway-guide", defaultDesc: "duale Ausbildung과 schulische Ausbildung의 차이, 직업 선택, 지원요건과 계약 전 확인사항을 한국인 지원자 관점에서 정리합니다." },
    { title: "독일 Studienkolleg 가이드 — 과정 선택과 Feststellungsprüfung", slug: "german-studienkolleg-guide", defaultDesc: "독일 대학 직접 입학자격이 부족할 때 Studienkolleg 필요 여부, 과정 유형, 입학시험과 Feststellungsprüfung을 확인하는 방법을 설명합니다." },
  ];

  const applicationTopics = [
    { title: "독일 학사 지원 가이드 — Bachelor 입학요건과 지원 일정", slug: "german-bachelor-application-guide", defaultDesc: "독일 Bachelor 지원 시 HZB, 전공 제한, 지원기관, 서류와 대학별 마감일을 체계적으로 관리하는 방법을 안내합니다." },
    { title: "독일 석사 지원 가이드 — Master 전공 적합성과 입학요건", slug: "german-master-application-guide", defaultDesc: "독일 Master 지원에서 선행 전공, 필수 학점, 성적·언어 요건과 대학별 심사자료를 준비하는 방법을 정리합니다." },
    { title: "uni-assist·VPD·Hochschulstart 가이드 — 지원 경로 구분", slug: "german-university-application-portals-guide", defaultDesc: "독일 대학 직접 지원, uni-assist, VPD와 Hochschulstart/DoSV가 각각 어떤 역할을 하는지와 중복 절차를 설명합니다." },
    { title: "독일 대학 지원서류 가이드 — 번역·공증·Zeugnisse 준비", slug: "german-university-application-documents-guide", defaultDesc: "한국 학력서류, 번역본, 인증사본, 어학증명과 대학별 추가자료를 누락 없이 준비하는 방법을 안내합니다." },
    { title: "독일 대학 어학요건 가이드 — TestDaF, DSH와 영어 증명", slug: "german-university-language-requirements-guide", defaultDesc: "독일어·영어 학위과정의 어학증명 종류, 요구 수준, 제출 시점과 대학별 예외를 확인하는 방법을 정리합니다." },
  ];

  const enrollmentTopics = [
    { title: "독일 대학 합격 후 등록 가이드 — Zulassung부터 Immatrikulation까지", slug: "german-university-enrollment-guide", defaultDesc: "독일 대학 합격 후 조건 확인, 보험 통지, Semesterbeitrag 납부와 Immatrikulation 완료까지 필요한 절차를 안내합니다." },
    { title: "독일 유학 비용 가이드 — Semesterbeitrag, 학비와 장학금", slug: "german-study-costs-funding-guide", defaultDesc: "Semesterbeitrag와 Studiengebühr의 차이, 생활비·보험·장학금을 포함한 독일 유학 예산을 현실적으로 계산하는 방법을 설명합니다." },
    { title: "독일 유학생 아르바이트 가이드 — 학생근로와 체류·보험 확인", slug: "german-student-work-guide", defaultDesc: "독일 체류법 §16b의 학생 근로일수 계산과 계약 전 확인할 체류허가, 세금·사회보험의 별도 기준을 설명합니다." },
  ];

  const transitionTopics = [
    { title: "독일 졸업 준비 가이드 — Exmatrikulation과 취업·체류 전환", slug: "german-graduation-transition-guide", defaultDesc: "독일 대학 졸업 전후에 학위증명, Exmatrikulation, 보험·학생신분 종료와 취업·체류 전환을 준비하는 순서를 안내합니다." },
  ];

  function renderTopicList(topics: typeof preparationTopics) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {topics.map(function (topic, i) {
          const matchedDb = activeGuides.find(function (guide) { return guide.slug === topic.slug; });
          const isPublished = !!matchedDb;

          return (
            <div key={i} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", boxSizing: "border-box" }}>
              <div style={{ flex: "1 1 300px", minWidth: "260px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "bold", margin: "0 0 6px 0", color: isPublished ? "#0f172a" : "#64748b", wordBreak: "keep-all" }}>
                  {isPublished ? matchedDb.title : topic.title}
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5", margin: "0 0 6px 0", wordBreak: "keep-all" }}>
                  {isPublished ? matchedDb.description : topic.defaultDesc}
                </p>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                  {isPublished ? "정식 가이드 게시됨 · 마지막 검증일: " + new Date(matchedDb.last_verified_at).toLocaleDateString() : "에디터 집필 중 · 2026 하반기 공개 예정"}
                </p>
              </div>
              {isPublished ? (
                <Link href={"/guide/" + matchedDb.slug} style={{ textDecoration: "none" }}>
                  <button style={{ padding: "6px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}>가이드 읽기</button>
                </Link>
              ) : (
                <span style={{ fontSize: "12px", color: "#94a3b8", background: "#f1f5f9", padding: "4px 10px", borderRadius: "4px", fontWeight: "500" }}>준비 중</span>
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
          <span style={{ color: "#0f172a", fontWeight: "bold" }}>유학·교육 (Studium & Ausbildung)</span>
        </div>
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: "bold", color: "#0f172a", margin: "0 0 12px 0", lineHeight: "1.3" }}>
            <span style={{ display: "inline-block" }}>🎓 독일 유학·교육 가이드</span>{" "}
            <span style={{ display: "inline-block" }}>Studium & Ausbildung</span>
          </h1>
          <p style={{ fontSize: "15px", color: "#64748b", lineHeight: "1.6", margin: 0 }}>
            독일 유학 경로 선택부터 대학 지원·등록, 재학 중 근로와 졸업 후 취업·체류 전환까지 이어지는 전체 흐름을 단계별로 확인하세요. 한국인이 실제로 준비하고 행동해야 할 핵심 절차와 독일어 용어를 한곳에 정리했습니다.
          </p>
        </div>
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🧭 유학 경로와 입학자격</span>{" "}<span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Studienwahl & Zulassung)</span>
          </h2>
          {renderTopicList(preparationTopics)}
        </section>
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>📝 대학 지원 준비</span>{" "}<span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Bewerbung & Unterlagen)</span>
          </h2>
          {renderTopicList(applicationTopics)}
        </section>
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🏫 합격 후 등록과 재학</span>{" "}<span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Immatrikulation & Studium)</span>
          </h2>
          {renderTopicList(enrollmentTopics)}
        </section>
        <section>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}>
            <span style={{ display: "inline-block" }}>🎓 졸업과 다음 단계</span>{" "}<span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>(Abschluss & Übergang)</span>
          </h2>
          {renderTopicList(transitionTopics)}
        </section>
      </div>
    </main>
  );
}
