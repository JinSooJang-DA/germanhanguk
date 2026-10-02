import { SITE_URL } from "@/lib/config";
import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getGuideCategoryHubSlug, getGuideCategoryLabel } from "@/lib/constants";
import AdSlot from "@/components/AdSlot";
import GuideCommunityCTA from "@/components/GuideCommunityCTA";
import GuideAudienceCards from "@/components/GuideAudienceCards";
import GuideQuickSummary from "@/components/GuideQuickSummary";
import GuideEmployeeSteps from "@/components/GuideEmployeeSteps";
import GuideStudentSituations from "@/components/GuideStudentSituations";
import GuideInsuranceComparison from "@/components/GuideInsuranceComparison";
import GuideBankComparison from "@/components/GuideBankComparison";
import { GUIDE_CONTENT } from "@/lib/guide-content";
import { GUIDE_SUPPLEMENTS } from "@/lib/guide-supplements";
import GuideSupplement from "@/components/GuideSupplement";
import { formatDate } from "@/lib/date";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: guide } = await supabase
    .from("guides")
    .select("title, seo_title, seo_description, status")
    .eq("slug", slug)
    .single();

  // 초안(draft) 상태이거나 존재하지 않는 가이드는 메타데이터 검색 및 인덱싱을 방지하여 보안 유출을 차단합니다.
  if (!guide || guide.status !== "published") {
    return {};
  }

  return {
    title: (guide.seo_title || guide.title) + " - GermanHanguk",
    description: guide.seo_description || "독일 정착 생활 공식 정보 가이드.",
    alternates: {
      canonical: SITE_URL + "/guide/" + slug,
    },
    openGraph: {
      title: (guide.seo_title || guide.title) + " - GermanHanguk",
      description: guide.seo_description || "독일 생활 공식 가이드.",
      type: "article",
      url: SITE_URL + "/guide/" + slug,
    },
  };
}

// 울트라 보안형 경량 마크다운-라이크 본문 파서 (XSS 원천 방지 및 컴파일 최적화)
interface ParsedBlock {
  type: "h2" | "h3" | "hr" | "ul" | "p";
  content: string;
  items?: string[];
}

// 1. 모든 개행 문자(이스케이프 및 생코드)를 표준 단일 개행으로 통일한 후, 인라인 토큰을 감지해 분할합니다.
function getBlocks(content: string): string[] {
  const normalized = content
    .replace(/\\r\\n|\\n/g, "\n")
    .replace(/\r\n/g, "\n");

  const lines = normalized.split("\n");
  const blocks: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 만약 한 줄(line) 안에 공백으로 구분된 여러 인라인 마크다운 토큰(##, --- 등)이 합쳐져 있다면,
    // 정규식을 사용해 해당 토큰들의 경계선에서 강제로 추가 분할해줍니다. (SQL 압축 오류 및 한줄 입력 완벽 대응)
    if (!trimmed.startsWith("## ") && !trimmed.startsWith("### ") && !trimmed.startsWith("- ") && !trimmed.startsWith("---") &&
        (trimmed.includes(" ## ") || trimmed.includes(" ### ") || trimmed.includes(" ---") || trimmed.includes(" - "))) {
      
      const subBlocks = trimmed.split(/(?=\s(?:##|###|---|\-)\s)/g);
      for (const sub of subBlocks) {
        const subTrimmed = sub.trim();
        if (subTrimmed) {
          blocks.push(subTrimmed);
        }
      }
    } else {
      blocks.push(trimmed);
    }
  }

  return blocks;
}

// 2. 단일 블록 배열들을 파싱 트리로 재가공합니다. 연속된 리스트(- )는 단일 <ul> 그룹으로 묶습니다.
function parseBlocks(blocks: string[]): ParsedBlock[] {
  const parsed: ParsedBlock[] = [];
  let currentUl: string[] | null = null;

  for (const block of blocks) {
    if (block.startsWith("- ")) {
      const itemText = block.replace("- ", "").trim();
      if (!currentUl) {
        currentUl = [itemText];
      } else {
        currentUl.push(itemText);
      }
    } else {
      if (currentUl) {
        parsed.push({ type: "ul", content: "", items: currentUl });
        currentUl = null;
      }

      if (block.startsWith("## ")) {
        parsed.push({ type: "h2", content: block.replace("## ", "").trim() });
      } else if (block.startsWith("### ")) {
        parsed.push({ type: "h3", content: block.replace("### ", "").trim() });
      } else if (block.startsWith("---")) {
        parsed.push({ type: "hr", content: "" });
      } else {
        parsed.push({ type: "p", content: block });
      }
    }
  }

  if (currentUl) {
    parsed.push({ type: "ul", content: "", items: currentUl });
  }

  return parsed;
}

// 3. 문장 내의 볼드체(**) 마크다운 요소를 React element로 안전하게 파싱합니다.
function renderTextWithBold(text: string) {
  const parts = text.split("**");
  return parts.map(function(part, index) {
    return index % 2 === 1 ? <strong key={index} style={{ color: "var(--gh-text)" }}>{part}</strong> : part;
  });
}

// 4. 최종 에디토리얼 가이드 렌더러
function renderStructuredContent(content: string) {
  if (!content) return null;
  const blocks = getBlocks(content);
  const parsed = parseBlocks(blocks);

  return parsed.map(function(block, i) {
    switch (block.type) {
      case "h2":
        return (
          <h2 key={i} style={{ fontSize: "22px", fontWeight: "bold", marginTop: "34px", marginBottom: "16px", color: "var(--gh-text)", borderLeft: "4px solid var(--gh-accent)", paddingLeft: "12px" }}>
            {renderTextWithBold(block.content)}
          </h2>
        );
      case "h3":
        return (
          <h3 key={i} style={{ fontSize: "18px", fontWeight: "bold", marginTop: "26px", marginBottom: "12px", color: "var(--gh-text)" }}>
            {renderTextWithBold(block.content)}
          </h3>
        );
      case "hr":
        return <hr key={i} style={{ border: "none", borderTop: "1px solid var(--gh-border)", margin: "32px 0" }} />;
      case "ul":
        return (
          <ul key={i} style={{ paddingLeft: "20px", margin: "16px 0", lineHeight: "1.7", color: "var(--gh-text-muted)" }}>
            {block.items?.map(function(item, idx) {
              return (
                <li key={idx} style={{ marginBottom: "8px" }}>
                  {renderTextWithBold(item)}
                </li>
              );
            })}
          </ul>
        );
      case "p":
        return (
          <p key={i} style={{ fontSize: "15px", lineHeight: "1.8", color: "var(--gh-text-muted)", margin: "14px 0", textAlign: "left" }}>
            {renderTextWithBold(block.content)}
          </p>
        );
      default:
        return null;
    }
  });
}

interface SourceItem {
  title: string;
  url: string;
}

export default async function GuideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 가이드 테이블에서 단건 조회 (status = published 조건 필수!)
  const { data: guide } = await supabase
    .from("guides")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  // 존재하지 않거나 초안(draft) 상태인 가이드는 Next.js 표준 404 핸들러 작동 (Soft 404 방지)
  if (!guide) {
    notFound();
  }

  const categoryLabel = getGuideCategoryLabel(guide.category, "ko");
  const sources = (guide.sources || []) as SourceItem[];

  return (
    <main style={{ minHeight: "80vh", padding: "40px 0 80px", background: "var(--gh-page-bg)" }}>
      <article style={{ maxWidth: "720px", margin: "0 auto", padding: "0 20px" }}>

        {/* 상단 브레드크럼 */}
        <div style={{ marginBottom: "24px", fontSize: "14px" }}>
          <Link href="/guide" style={{ textDecoration: "none", color: "var(--gh-text-muted)" }}>생활정보 가이드</Link>
          <span style={{ color: "var(--gh-text-subtle)", margin: "0 8px" }}>&gt;</span>
          <Link href={"/guide/" + getGuideCategoryHubSlug(guide.category)} style={{ textDecoration: "none", color: "var(--gh-text-muted)" }}>{categoryLabel}</Link>
          <span style={{ color: "var(--gh-text-subtle)", margin: "0 8px" }}>&gt;</span>
          <span style={{ color: "var(--gh-text)", fontWeight: "bold" }}>상세 정보</span>
        </div>

        {/* 에디토리얼 메타 정보 */}
        <div style={{ borderBottom: "1px solid var(--gh-border)", paddingBottom: "24px", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "clamp(22px, 5vw, 30px)", fontWeight: "bold", color: "var(--gh-text)", margin: "0 0 16px 0", lineHeight: "1.3" }}>
            {guide.title}
          </h1>
          <p style={{ fontSize: "16px", color: "var(--gh-text-muted)", lineHeight: "1.6", margin: "0 0 16px 0", fontStyle: "italic" }}>
            {guide.description}
          </p>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px", color: "var(--gh-text-subtle)" }}>
            <span>✍️ GermanHanguk 공식 에디터 집필</span>
            {guide.last_verified_at && (
              <span style={{ color: "var(--gh-success)", fontWeight: "bold" }}>
                ✅ 마지막 정보 확인일: {formatDate(guide.last_verified_at)}
              </span>
            )}
            <span>수정일: {formatDate(guide.updated_at)}</span>
          </div>
        </div>

        {GUIDE_CONTENT[slug]?.quickSummary && (
          <GuideQuickSummary items={GUIDE_CONTENT[slug].quickSummary} />
        )}

        {GUIDE_CONTENT[slug]?.showInsuranceComparison && (
          <GuideInsuranceComparison />
        )}

        {GUIDE_CONTENT[slug]?.showEmployeeSteps && (
          <GuideEmployeeSteps />
        )}

        {GUIDE_CONTENT[slug]?.showStudentSituations && (
          <GuideStudentSituations />
        )}

        {GUIDE_CONTENT[slug]?.audience && (
          <GuideAudienceCards items={GUIDE_CONTENT[slug].audience} />
        )}

        {slug === "german-bank-account-guide" && (
          <GuideBankComparison />
        )}

        {/* 가이드 콘텐츠 */}
        <div className="guide-body">
          {renderStructuredContent(guide.content)}
        </div>

        {GUIDE_SUPPLEMENTS[slug] && (
          <GuideSupplement supplement={GUIDE_SUPPLEMENTS[slug]} />
        )}

        {/* 광고 영역 (중간 슬롯) */}
        <AdSlot position="guide-middle" />

        {/* 공식 출처 및 참고자료 */}
        {sources.length > 0 && (
          <div
            style={{
              marginTop: "40px",
              padding: "20px 24px",
              background: "var(--gh-guide-source-surface)",
              border: "1px solid var(--gh-guide-source-border)",
              borderRadius: "0",
              boxShadow: "var(--gh-guide-source-shadow)",
              boxSizing: "border-box",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: "bold", color: "var(--gh-guide-source-text)", margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: "6px" }}>
              🌐 공식 공공 출처 & 참고자료 (Authoritative Sources)
            </h3>
            <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", lineHeight: "1.6" }}>
              {sources.map(function (src, sidx) {
                return (
                  <li key={sidx} style={{ marginBottom: "6px", wordBreak: "break-all", overflowWrap: "anywhere" }}>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--gh-guide-source-link)", textDecoration: "underline", fontWeight: "500" }}
                    >
                      {src.title}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* 광고 영역 (하단 슬롯) */}
        <AdSlot position="guide-bottom" />

        {/* 커뮤니티 이동 CTA */}
        <GuideCommunityCTA categoryLabel={categoryLabel} categoryValue={guide.category} />

      </article>
    </main>
  );
}
