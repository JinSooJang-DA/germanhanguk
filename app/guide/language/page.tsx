import { SITE_URL } from "@/lib/config";
import React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const metadata = {
  title: "언어 가이드 - GermanHanguk",
  description: "독일어 학습·시험과 독일 생활 실전 독일어, 한국어 학습·TOPIK, 한독 언어교환을 정리한 언어 가이드입니다.",
  alternates: { canonical: SITE_URL + "/guide/language" },
  openGraph: {
    title: "언어 가이드 - GermanHanguk",
    description: "독일 생활에서 말하고 이해하는 독일어부터 한국어 학습과 한독 언어교환까지 확인하세요.",
    type: "website",
    url: SITE_URL + "/guide/language",
  },
};

type Topic = { title: string; slug: string; defaultDesc: string };

const germanLearningTopics: Topic[] = [
  { title: "독일어 학습 로드맵 — A1부터 B1·B2까지 무엇을 배워야 하나", slug: "german-language-learning-roadmap-guide", defaultDesc: "독일 생활 목표에 맞춰 CEFR/GER 수준을 이해하고 실제 과제로 연결하는 독일어 학습 계획을 세웁니다." },
  { title: "독일어 시험 가이드 — Goethe, telc, DTZ와 TestDaF 차이", slug: "german-language-exams-guide", defaultDesc: "취업·대학·체류 등 목적에 따라 인정기관과 요구 수준을 확인하고 맞는 독일어 시험을 고르는 방법을 안내합니다." },
  { title: "BAMF Integrationskurs 가이드 — 과정, DTZ와 Leben in Deutschland", slug: "german-integration-course-language-guide", defaultDesc: "Integrationskurs의 구성, DTZ·Leben in Deutschland, 비용과 수료 흐름을 구분해 안내합니다." },
];

const germanLifeTopics: Topic[] = [
  { title: "독일 관공서 편지 읽기 — Bescheid, Frist와 요구서류 이해하기", slug: "german-official-letters-language-guide", defaultDesc: "관공서 편지에서 요구사항·기한·제출방법을 찾아 안전하게 대응하는 읽기·쓰기 방법을 설명합니다." },
  { title: "독일 집·이웃 생활 독일어 — 집주인, Hausverwaltung과 WG 의사소통", slug: "german-housing-communication-language-guide", defaultDesc: "집 문의와 방문, 관리회사 연락, 고장 신고와 WG·이웃 대화에 필요한 실전 독일어를 익힙니다." },
  { title: "독일 직장 독일어 — 이메일, 회의, Sie/Du와 동료 의사소통", slug: "german-workplace-communication-language-guide", defaultDesc: "업무 이메일·회의·일정 조율·피드백을 명확하고 기록 가능하게 처리하는 독일어를 안내합니다." },
  { title: "독일 병원·약국 독일어 — 예약, 증상 설명과 진료 의사소통", slug: "german-medical-communication-language-guide", defaultDesc: "진료 예약부터 증상·복용약 설명, E-Rezept와 약 복용법 확인까지 필요한 독일어를 정리합니다." },
  { title: "독일 Kita·학교 학부모 독일어 — Elternabend부터 병결 연락까지", slug: "german-school-parent-language-guide", defaultDesc: "등하원·병결·학부모 공지·상담 등 Kita와 학교에서 필요한 실제 의사소통을 안내합니다." },
];

const koreanLearningTopics: Topic[] = [
  { title: "한국어 학습 로드맵 — 한글부터 초급 회화까지", slug: "korean-language-learning-roadmap-guide", defaultDesc: "한글, 발음, 기본 문장과 존댓말, 초급 회화를 단계적으로 익히는 학습 경로를 안내합니다." },
  { title: "한국어 존댓말 가이드 — 반말, 해요체, 합니다체와 호칭", slug: "korean-honorifics-speech-levels-guide", defaultDesc: "존댓말·높임·말투·호칭을 구분하고 관계와 상황에 맞는 표현을 고르는 방법을 설명합니다." },
  { title: "한국어 문장 만들기 — 어순, 조사와 동사 활용의 기본", slug: "korean-sentence-grammar-basics-guide", defaultDesc: "한국어의 기본 어순 경향, 조사, 생략과 동사·형용사 활용을 실제 초급 문장으로 익힙니다." },
  { title: "한국 생활 실전 한국어 — 식당, 카페, 쇼핑, 교통과 서비스", slug: "korean-everyday-conversation-guide", defaultDesc: "식당·쇼핑·교통·예약·문제 상황에서 단어를 바꿔 재사용할 수 있는 한국어 대화 패턴을 안내합니다." },
  { title: "TOPIK 가이드 — 시험 종류, 급수와 공식 학습 경로", slug: "korean-topik-guide", defaultDesc: "TOPIK I·II와 PBT·IBT·말하기 시험을 구분하고 접수와 준비를 안전하게 계획하는 방법을 정리합니다." },
];

const exchangeTopics: Topic[] = [
  { title: "한독 Tandem 언어교환 가이드 — 좋은 파트너 찾기와 오래 이어가는 방법", slug: "german-korean-language-exchange-guide", defaultDesc: "목표·시간·교정 방식을 공정하게 합의하고 안전하게 지속하는 한독 언어교환 방법을 안내합니다." },
];

export default async function LanguageHubPage() {
  const { data: dbGuides } = await supabase
    .from("guides")
    .select("id, slug, title, description, last_verified_at")
    .eq("category", "language")
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
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>{isPublished ? "정식 가이드 게시됨 · 마지막 검증일: " + new Date(matchedDb.last_verified_at).toLocaleDateString() : "에디터 집필 중 · 2026 하반기 공개 예정"}</p>
          </div>
          {isPublished ? <Link href={"/guide/" + matchedDb.slug} style={{ textDecoration: "none" }}><button style={{ padding: "6px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}>가이드 읽기</button></Link> : <span style={{ fontSize: "12px", color: "#94a3b8", background: "#f1f5f9", padding: "4px 10px", borderRadius: "4px", fontWeight: "500" }}>준비 중</span>}
        </div>;
      })}
    </div>;
  }

  const sections = [
    ["🇩🇪 독일어 학습과 시험", "Deutsch lernen & Prüfungen", germanLearningTopics],
    ["💬 독일 생활 실전 독일어", "Deutsch im Alltag", germanLifeTopics],
    ["🇰🇷 한국어 학습과 TOPIK", "Koreanisch lernen & TOPIK", koreanLearningTopics],
    ["🤝 한독 언어교환", "Deutsch-Koreanischer Tandem", exchangeTopics],
  ] as const;

  return <main style={{ minHeight: "80vh", padding: "40px 0 80px", background: "#f8fafc" }}><div className="wrapper" style={{ maxWidth: "800px", margin: "0 auto", padding: "0 20px" }}>
    <div style={{ marginBottom: "20px", fontSize: "14px" }}><Link href="/guide" style={{ textDecoration: "none", color: "#64748b" }}>생활정보 가이드</Link><span style={{ color: "#94a3b8", margin: "0 8px" }}>&gt;</span><span style={{ color: "#0f172a", fontWeight: "bold" }}>언어 (Sprache)</span></div>
    <div style={{ marginBottom: "40px" }}><h1 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: "bold", color: "#0f172a", margin: "0 0 12px", lineHeight: "1.3" }}><span style={{ display: "inline-block" }}>🗣️ 한독 언어 가이드</span>{" "}<span style={{ display: "inline-block" }}>Deutsch & Koreanisch</span></h1><p style={{ fontSize: "15px", color: "#64748b", lineHeight: "1.6", margin: 0 }}>독일 생활에서 실제로 말하고 이해하는 독일어부터 한국어 학습·TOPIK, 안전하고 오래가는 한독 언어교환까지 목적별 학습 흐름을 확인하세요.</p></div>
    {sections.map(([title, subtitle, topics], index) => <section key={subtitle} style={{ marginBottom: index === sections.length - 1 ? 0 : "40px" }}><h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "10px", marginBottom: "20px" }}><span style={{ display: "inline-block" }}>{title}</span>{" "}<span className="german-sub-title" style={{ fontWeight: "normal", color: "#64748b" }}>({subtitle})</span></h2>{renderTopicList(topics)}</section>)}
  </div></main>;
}
