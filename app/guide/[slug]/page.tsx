import { SITE_URL } from "@/lib/config";
import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getGuideCategoryLabel } from "@/lib/constants";
import AdSlot from "@/components/AdSlot";
import GuideCommunityCTA from "@/components/GuideCommunityCTA";

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
function renderStructuredContent(content: string) {
  if (!content) return null;
  const blocks = content.split("\\n\\n");
  
  return blocks.map(function(block, i) {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={i} style={{ fontSize: "22px", fontWeight: "bold", marginTop: "34px", marginBottom: "16px", color: "#0f172a", borderLeft: "4px solid #2563eb", paddingLeft: "12px" }}>
          {trimmed.replace("## ", "")}
        </h2>
      );
    }
    
    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={i} style={{ fontSize: "18px", fontWeight: "bold", marginTop: "26px", marginBottom: "12px", color: "#1e293b" }}>
          {trimmed.replace("### ", "")}
        </h3>
      );
    }
    
    if (trimmed.startsWith("- ")) {
      const items = trimmed.split("\\n").map(function(line) { return line.replace("- ", "").trim(); });
      return (
        <ul key={i} style={{ paddingLeft: "20px", margin: "16px 0", lineHeight: "1.7", color: "#334155" }}>
          {items.map(function(item, idx) {
            const parts = item.split("**");
            return (
              <li key={idx} style={{ marginBottom: "8px" }}>
                {parts.map(function(part, pidx) {
                  return pidx % 2 === 1 ? <strong key={pidx} style={{ color: "#0f172a" }}>{part}</strong> : part;
                })}
              </li>
            );
          })}
        </ul>
      );
    }
    
    if (trimmed.startsWith("---")) {
      return <hr key={i} style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "32px 0" }} />;
    }

    // 일반 문단 렌더러 (볼드체 ** 파싱 탑재)
    const parts = trimmed.split("**");
    return (
      <p key={i} style={{ fontSize: "15px", lineHeight: "1.8", color: "#334155", margin: "14px 0", textAlign: "justify" }}>
        {parts.map(function(part, pidx) {
          return pidx % 2 === 1 ? <strong key={pidx} style={{ color: "#0f172a" }}>{part}</strong> : part;
        })}
      </p>
    );
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
    <main style={{ minHeight: "80vh", padding: "40px 0 80px", background: "#f8fafc" }}>
      <article style={{ maxWidth: "720px", margin: "0 auto", padding: "0 20px" }}>
        
        {/* 상단 브레드크럼 */}
        <div style={{ marginBottom: "24px", fontSize: "14px" }}>
          <Link href="/guide" style={{ textDecoration: "none", color: "#64748b" }}>생활정보 가이드</Link>
          <span style={{ color: "#94a3b8", margin: "0 8px" }}>&gt;</span>
          <Link href={"/guide/" + guide.category} style={{ textDecoration: "none", color: "#64748b" }}>{categoryLabel}</Link>
          <span style={{ color: "#94a3b8", margin: "0 8px" }}>&gt;</span>
          <span style={{ color: "#0f172a", fontWeight: "bold" }}>상세 정보</span>
        </div>

        {/* 에디토리얼 메타 정보 */}
        <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "24px", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "clamp(22px, 5vw, 30px)", fontWeight: "bold", color: "#0f172a", margin: "0 0 16px 0", lineHeight: "1.3" }}>
            {guide.title}
          </h1>
          <p style={{ fontSize: "16px", color: "#475569", lineHeight: "1.6", margin: "0 0 16px 0", fontStyle: "italic" }}>
            {guide.description}
          </p>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px", color: "#94a3b8" }}>
            <span>✍️ GermanHanguk 공식 에디터 집필</span>
            {guide.last_verified_at && (
              <span style={{ color: "#16a34a", fontWeight: "bold" }}>
                ✅ 마지막 정보 확인일: {new Date(guide.last_verified_at).toLocaleDateString()}
              </span>
            )}
            <span>수정일: {new Date(guide.updated_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* 가이드 콘텐츠 */}
        <div className="guide-body">
          {renderStructuredContent(guide.content)}
        </div>

        {/* 광고 영역 (중간 슬롯) */}
        <AdSlot position="guide-middle" />

        {/* 공식 출처 및 참고자료 */}
        {sources.length > 0 && (
          <div
            style={{
              marginTop: "40px",
              padding: "20px 24px",
              background: "#f1f5f9",
              borderRadius: "8px",
              boxSizing: "border-box",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: "bold", color: "#334155", margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: "6px" }}>
              🌐 공식 공공 출처 & 참고자료 (Authoritative Sources)
            </h3>
            <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", lineHeight: "1.6" }}>
              {sources.map(function(src, sidx) {
                return (
                  <li key={sidx} style={{ marginBottom: "6px", wordBreak: "break-all", overflowWrap: "anywhere" }}>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#2563eb", textDecoration: "underline", fontWeight: "500" }}
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
