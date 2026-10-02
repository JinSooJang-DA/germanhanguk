"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date";
import type { Article } from "@/types/article";

function ArticlesContent() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    async function fetchArticles() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("articles")
          .select("*")
          .eq("status", "published")
          .order("published_at", { ascending: false });

        if (fetchError) {
          console.error("Articles fetch error:", fetchError);
          if (isCurrent) {
            setError("독일 소식을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
            setArticles([]);
          }
          return;
        }

        if (isCurrent) {
          setArticles(data || []);
        }
      } catch (err) {
        console.error("Unexpected error fetching articles:", err);
        if (isCurrent) {
          setError("독일 소식을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
          setArticles([]);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    fetchArticles();

    return () => {
      isCurrent = false;
    };
  }, [retryKey]);

  function handleRetry() {
    setRetryKey((prev) => prev + 1);
  }

  if (loading) {
    return (
      <main style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "15px" }}>독일 소식을 불러오는 중입니다...</p>
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

  return (
    <main className="articles-page" style={{ minHeight: "80vh", padding: "40px 20px var(--gh-footer-height, 80px) 20px" }}>
      <div className="articles-shell" style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ borderBottom: "1px solid var(--gh-border)", paddingBottom: "16px", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "var(--gh-text)", margin: "0 0 8px" }}>🇩🇪 독일 소식</h1>
          <p style={{ color: "var(--gh-text-muted)", fontSize: "14px", margin: 0 }}>
            독일의 주요 법령 변경, 정책 제도, 교통, 생활 정보와 최신 뉴스 소식을 전해드립니다.
          </p>
        </div>

        {articles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", border: "1px dashed var(--gh-border)", borderRadius: "0", background: "var(--gh-surface-muted)" }}>
            <p style={{ color: "var(--gh-text-muted)", margin: 0, fontSize: "14px" }}>등록된 최신 소식이 아직 없습니다.</p>
          </div>
        ) : (
          <div className="articles-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
            {articles.map((article) => (
              <Link
                key={article.id}
                href={"/articles/" + article.slug}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--gh-surface-muted)",
                  border: "1px solid var(--gh-border)",
                  borderRadius: "0",
                  overflow: "hidden",
                  textDecoration: "none",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                className="article-card"
              >
                {article.image_url ? (
                  <div style={{ height: "180px", overflow: "hidden", position: "relative" }}>
                    <img
                      src={article.image_url}
                      alt={article.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                ) : (
                  <div style={{ height: "180px", background: "linear-gradient(135deg, #26332e 0%, #151b18 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "36px" }}>📰</span>
                  </div>
                )}
                <div className="article-card-body" style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--gh-accent)", background: "color-mix(in srgb, var(--gh-accent) 12%, transparent)", padding: "2px 8px", borderRadius: "0" }}>
                      {article.category}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--gh-text-subtle)" }}>
                      {article.published_at ? formatDate(article.published_at) : ""}
                    </span>
                  </div>
                  <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "var(--gh-text)", margin: "0 0 8px 0", lineHeight: "1.4" }}>
                    {article.title}
                  </h2>
                  <p style={{ fontSize: "14px", color: "var(--gh-text-muted)", margin: "0 0 16px 0", flex: 1, lineHeight: "1.6" }}>
                    {article.summary}
                  </p>
                  <span style={{ fontSize: "13px", fontWeight: "bold", color: "var(--gh-text-muted)", display: "flex", alignItems: "center" }}>
                    기사 읽기 →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function ArticlesPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "15px" }}>독일 소식을 불러오는 중입니다...</p>
      </main>
    }>
      <ArticlesContent />
    </Suspense>
  );
}
