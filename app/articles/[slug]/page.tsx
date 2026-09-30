"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date";
import type { Article } from "@/types/article";

function renderParagraphs(text: string) {
  if (!text) return null;
  return text.split(/\n\s*\n/).map((para, index) => {
    const lines = para.split(/\n/);
    return (
      <p key={index} style={{ marginBottom: "20px", lineHeight: "1.8", fontSize: "16px", color: "var(--gh-text)", whiteSpace: "pre-wrap" }}>
        {lines.map((line, lIdx) => (
          <span key={lIdx}>
            {line}
            {lIdx < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}

export default function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    async function fetchArticle() {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const { data, error: fetchError } = await supabase
          .from("articles")
          .select("*")
          .eq("slug", slug)
          .eq("status", "published")
          .maybeSingle();

        if (fetchError) {
          console.error("Article fetch error:", fetchError);
          if (isCurrent) {
            setError("기사를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
          }
          return;
        }

        if (!data) {
          if (isCurrent) {
            setNotFound(true);
          }
          return;
        }

        if (isCurrent) {
          setArticle(data);
        }
      } catch (err) {
        console.error("Unexpected error fetching article:", err);
        if (isCurrent) {
          setError("기사를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    fetchArticle();

    return () => {
      isCurrent = false;
    };
  }, [slug, retryKey]);

  function handleRetry() {
    setRetryKey((prev) => prev + 1);
  }

  if (loading) {
    return (
      <main style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "15px" }}>기사를 불러오는 중입니다...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "var(--gh-text-muted)", marginBottom: "20px", fontSize: "15px" }}>{error}</p>
          <button
            onClick={handleRetry}
            style={{
              padding: "10px 20px",
              background: "var(--gh-control-active)",
              color: "var(--gh-control-active-text)",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  if (notFound || !article) {
    return (
      <main style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "var(--gh-text-muted)", marginBottom: "20px", fontSize: "15px" }}>존재하지 않거나 게시되지 않은 기사입니다.</p>
          <Link href="/articles" style={{ textDecoration: "none" }}>
            <button
              style={{
                padding: "10px 20px",
                background: "var(--gh-control-active)",
                color: "var(--gh-control-active-text)",
                border: "none",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              독일 소식 목록으로 돌아가기
            </button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "80vh", padding: "40px 20px var(--gh-footer-height) 20px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* 네비게이션 경로 */}
        <div style={{ marginBottom: "20px" }}>
          <Link href="/articles" style={{ textDecoration: "none", color: "var(--gh-text-muted)", fontSize: "14px" }}>
            ← 독일 소식 목록으로 돌아가기
          </Link>
        </div>

        {/* 기사 헤더 */}
        <div style={{ marginBottom: "24px" }}>
          <span style={{ fontSize: "13px", fontWeight: "bold", color: "#3b82f6", background: "rgba(59, 130, 246, 0.1)", padding: "2px 8px", borderRadius: "4px", display: "inline-block", marginBottom: "12px" }}>
            {article.category}
          </span>
          <h1 style={{ fontSize: "32px", fontWeight: "bold", color: "var(--gh-text)", margin: "0 0 12px 0", lineHeight: "1.3" }}>
            {article.title}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", color: "var(--gh-text-subtle)", fontSize: "14px" }}>
            <span>게시일: {article.published_at ? formatDate(article.published_at) : ""}</span>
            {article.source_checked_at && (
              <span>출처 최종 확인일: {formatDate(article.source_checked_at)}</span>
            )}
          </div>
        </div>

        {/* 요약문 */}
        {article.summary && (
          <div style={{ background: "var(--gh-surface-muted)", borderLeft: "4px solid var(--gh-border)", padding: "16px 20px", borderRadius: "0 8px 8px 0", marginBottom: "30px", fontSize: "15px", color: "var(--gh-text-subtle)", lineHeight: "1.6" }}>
            {article.summary}
          </div>
        )}

        {/* 대표 이미지 */}
        {article.image_url && (
          <div style={{ borderRadius: "12px", overflow: "hidden", marginBottom: "30px", maxHeight: "450px" }}>
            <img
              src={article.image_url}
              alt={article.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}

        {/* 본문 */}
        <div style={{ marginBottom: "40px" }}>
          {renderParagraphs(article.content)}
        </div>

        {/* 관련 출처 */}
        {article.source_urls && article.source_urls.length > 0 && (
          <div style={{ borderTop: "1px solid var(--gh-border)", paddingTop: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "var(--gh-text)", margin: "0 0 12px 0" }}>🔗 관련 공식 출처</h3>
            <ul style={{ paddingLeft: "20px", margin: 0 }}>
              {article.source_urls.map((source, sIdx) => {
                const isSafeUrl = source.url && (source.url.startsWith("http://") || source.url.startsWith("https://"));
                return (
                  <li key={sIdx} style={{ marginBottom: "8px" }}>
                    {isSafeUrl ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        style={{ color: "#3b82f6", textDecoration: "underline", fontSize: "14px", fontWeight: "500" }}
                      >
                        {source.title || source.url}
                      </a>
                    ) : (
                      <span style={{ fontSize: "14px", color: "var(--gh-text-muted)" }}>
                        {source.title} (유효하지 않은 링크)
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
