import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date";
import { notFound } from "next/navigation";
import type { Article } from "@/types/article";
import ArticleRetryButton from "@/components/ArticleRetryButton";

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

function parseSafeUrl(urlString: string): string | null {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const { data: article } = await supabase
      .from("articles")
      .select("title, summary, image_url")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (!article) {
      return { title: "기사를 찾을 수 없습니다 - GermanHanguk" };
    }

    const title = article.title + " - GermanHanguk";
    const description = article.summary || "";

    const metadata: Metadata = {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        images: article.image_url ? [{ url: article.image_url, alt: article.title }] : undefined,
      },
    };

    return metadata;
  } catch (err) {
    console.error("Error generating metadata:", err);
    return { title: "독일 소식 - GermanHanguk" };
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let article: Article | null = null;
  let fetchError = false;

  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      console.error("Article fetch error inside page:", error);
      fetchError = true;
    } else {
      article = data;
    }
  } catch (err) {
    console.error("Unexpected error fetching article inside page:", err);
    fetchError = true;
  }

  if (fetchError) {
    return (
      <main style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "var(--gh-text-muted)", marginBottom: "20px", fontSize: "15px" }}>
            기사를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
          <ArticleRetryButton />
        </div>
      </main>
    );
  }

  if (!article) {
    notFound();
  }

  const imageSource = article.source_urls?.find((source) => source.kind === "image");
  const articleSources = article.source_urls?.filter((source) => source.kind !== "image") ?? [];

  return (
    <main className="article-detail-page" style={{ minHeight: "80vh", padding: "40px 20px var(--gh-footer-height, 80px) 20px" }}>
      <div className="article-detail-shell" style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* 네비게이션 경로 */}
        <div style={{ marginBottom: "20px" }}>
          <Link href="/articles" style={{ textDecoration: "none", color: "var(--gh-text-muted)", fontSize: "14px" }}>
            ← 독일 소식 목록으로 돌아가기
          </Link>
        </div>

        {/* 기사 헤더 */}
        <div style={{ marginBottom: "24px" }}>
          <span style={{ fontSize: "13px", fontWeight: "bold", color: "var(--gh-accent)", background: "color-mix(in srgb, var(--gh-accent) 12%, transparent)", padding: "2px 8px", borderRadius: "4px", display: "inline-block", marginBottom: "12px" }}>
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
          <figure style={{ margin: "0 0 30px 0" }}>
            <div style={{ borderRadius: "12px", overflow: "hidden", maxHeight: "450px" }}>
              <img src={article.image_url} alt={article.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            {article.source_urls.find((source) => source.kind === "image") && (
              <figcaption style={{ marginTop: 8, fontSize: 12, color: "var(--gh-text-muted)" }}>
                <a href={article.source_urls.find((source) => source.kind === "image")?.url}
                  target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
                  {article.source_urls.find((source) => source.kind === "image")?.title}
                </a>
              </figcaption>
            )}
          </figure>
        )}

        {/* 본문 */}
        <div style={{ marginBottom: "40px" }}>
          {renderParagraphs(article.content)}
        </div>

        {/* 관련 출처 */}
        {articleSources.length > 0 && (
          <div style={{ borderTop: "1px solid var(--gh-border)", paddingTop: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "var(--gh-text)", margin: "0 0 12px 0" }}>🔗 원문 출처</h3>
            <ul style={{ paddingLeft: "20px", margin: 0 }}>
              {articleSources.map((source, sIdx) => {
                const safeUrl = parseSafeUrl(source.url);
                return (
                  <li key={sIdx} style={{ marginBottom: "8px" }}>
                    {safeUrl ? (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--gh-accent)", textDecoration: "underline", fontSize: "14px", fontWeight: "500" }}
                      >
                        {source.title ? `${source.title} · 원문 기사 보기 ↗` : "원문 기사 보기 ↗"}
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
