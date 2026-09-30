"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  CATEGORIES,
  getCategoryLabel,
  shouldDisplayPostRegion,
} from "@/lib/constants";
import { formatDate } from "@/lib/date";
import type { Post as BasePost } from "@/types/post";
import type { Article } from "@/types/article";

interface EngagementCount {
  count: number;
}

type Post = BasePost & {
  comments?: EngagementCount[] | null;
  post_likes?: EngagementCount[] | null;
};



function HomeContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") || "all";

  const [posts, setPosts] = useState<Post[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
  const [articlesError, setArticlesError] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const selectedCategory = categoryParam;
  const [searchKeyword] = useState("");
  const [loadedCategory, setLoadedCategory] = useState<string | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [postsRetryKey, setPostsRetryKey] = useState(0);
  const loading = loadedCategory !== selectedCategory;

  useEffect(function() {
    let isCurrent = true;

    async function fetchFeaturedArticles() {
      try {
        setArticlesError(false);
        const { data, error } = await supabase
          .from("articles")
          .select("*")
          .eq("status", "published")
          .eq("is_featured", true)
          .order("published_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Featured articles fetch error:", error);
          if (isCurrent) {
            setFeaturedArticles([]);
            setArticlesError(true);
          }
          return;
        }

        if (isCurrent) {
          setFeaturedArticles(data || []);
        }
      } catch (err) {
        console.error("Unexpected articles fetch error:", err);
        if (isCurrent) {
          setFeaturedArticles([]);
          setArticlesError(true);
        }
      }
    }

    async function fetchTrendingPosts() {
      try {
        // 조회수(views)가 높은 인기 글 5개 조회 (N+1 방지를 위해 댓글/좋아요 카운트 조인)
        const { data, error } = await supabase
          .from("posts")
          .select("*, comments(count), post_likes(count)")
          .order("views", { ascending: false })
          .limit(5)
          .returns<Post[]>();

        if (error) {
          console.error("Trending posts fetch error:", error);
          if (isCurrent) setTrendingPosts([]);
          return;
        }

        if (data && isCurrent) {
          setTrendingPosts(data);
        }
      } catch (err) {
        console.error("Unexpected trending posts fetch error:", err);
        if (isCurrent) setTrendingPosts([]);
      }
    }

    async function fetchPosts() {
      try {
      // N+1 방지를 위해 댓글 수(comments) 및 좋아요 수(post_likes) 조인하여 한 번에 페칭
      let query = supabase
        .from("posts")
        .select("*, comments(count), post_likes(count)")
        .order("created_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      if (searchKeyword.trim()) {
        const keyword = searchKeyword.trim();
        query = query.or("title.ilike.%" + keyword + "%,content.ilike.%" + keyword + "%");
      }

      const { data, error } = await query.returns<Post[]>();
      if (error) {
        console.error("Posts fetch error:", error);
        if (isCurrent) {
          setPosts([]);
          setPostsError("게시글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        }
        return;
      }

      const postsData = data || [];
      const authorIds = Array.from(new Set(postsData.map(function(p) { return p.author_id; }).filter(Boolean)));
      const avatarMap: Record<string, string> = {};

      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, avatar_url")
          .in("id", authorIds);

        if (profiles) {
          profiles.forEach(function(p) {
            if (p.avatar_url) avatarMap[p.id] = p.avatar_url;
          });
        }
      }

      const postsWithAvatar: Post[] = postsData.map(function(p) {
        return {
          ...p,
          author_avatar: p.author_id ? avatarMap[p.author_id] || "" : "",
        };
      });

      if (isCurrent) {
        setPosts(postsWithAvatar);
        setPostsError(null);
      }
      } catch (err) {
        console.error("Unexpected posts fetch error:", err);
        if (isCurrent) {
          setPosts([]);
          setPostsError("게시글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        }
      } finally {
        if (isCurrent) setLoadedCategory(selectedCategory);
      }
    }

    fetchPosts();
    fetchFeaturedArticles();
    fetchTrendingPosts();

    return function() {
      isCurrent = false;
    };
  }, [postsRetryKey, searchKeyword, selectedCategory]);

  const retryPosts = function() {
    setPostsError(null);
    setLoadedCategory(null);
    setPostsRetryKey(function(previous) {
      return previous + 1;
    });
  };

  const nextSlide = function() {
    setCurrentSlide(function(prev) {
      return prev === featuredArticles.length - 1 ? 0 : prev + 1;
    });
  };

  const prevSlide = function() {
    setCurrentSlide(function(prev) {
      return prev === 0 ? featuredArticles.length - 1 : prev - 1;
    });
  };

  return (
    <main className="main-page">
      {selectedCategory === "all" && !articlesError && featuredArticles.length > 0 && (
        <section style={{ maxWidth: "1200px", margin: "30px auto", padding: "0 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "var(--gh-text)", margin: 0 }}>독일 주요 소식</h2>
            <Link href="/articles" style={{ color: "var(--gh-text-muted)", fontSize: "14px", textDecoration: "none", fontWeight: "500" }}>
              전체 기사 보기 →
            </Link>
          </div>
          <div
            style={{
              position: "relative",
              borderRadius: "12px",
              overflow: "hidden",
              background: "#0f172a",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
              height: "400px",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "100%",
                height: "100%",
                transform: "translateX(-" + (currentSlide * 100) + "%)",
                transition: "transform 0.5s ease-in-out",
              }}
            >
              {featuredArticles.map(function(article) {
                return (
                  <Link
                    key={article.id}
                    href={"/articles/" + article.slug}
                    style={{
                      minWidth: "100%",
                      height: "100%",
                      position: "relative",
                      display: "block",
                      textDecoration: "none",
                    }}
                  >
                    {article.image_url ? (
                      <img
                        src={article.image_url}
                        alt={article.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          opacity: 0.4,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                        }}
                      />
                    )}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "50px",
                        left: "40px",
                        right: "40px",
                        color: "#fff",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: "bold", color: "#60a5fa", textTransform: "uppercase", marginBottom: "8px", display: "inline-block", background: "rgba(0, 0, 0, 0.4)", padding: "2px 8px", borderRadius: "4px" }}>
                        {article.category}
                      </div>
                      <h2 className="home-hero-title" style={{ fontSize: "32px", fontWeight: "bold", margin: "0 0 12px 0", lineHeight: "1.2" }}>
                        {article.title}
                      </h2>
                      <p style={{ fontSize: "15px", color: "#cbd5e1", margin: 0, maxWidth: "800px" }}>
                        {article.summary}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {featuredArticles.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  style={{
                    position: "absolute",
                    left: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(0, 0, 0, 0.5)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    cursor: "pointer",
                    fontSize: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                  }}
                >
                  ❮
                </button>
                <button
                  onClick={nextSlide}
                  style={{
                    position: "absolute",
                    right: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(0, 0, 0, 0.5)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    cursor: "pointer",
                    fontSize: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                  }}
                >
                  ❯
                </button>

                <div
                  style={{
                    position: "absolute",
                    bottom: "16px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: "8px",
                    zIndex: 10,
                  }}
                >
                  {featuredArticles.map(function(_, index) {
                    return (
                      <button
                        key={index}
                        onClick={setCurrentSlide.bind(null, index)}
                        style={{
                          width: currentSlide === index ? "24px" : "10px",
                          height: "10px",
                          borderRadius: "5px",
                          border: "none",
                          background: currentSlide === index ? "#2563eb" : "rgba(255, 255, 255, 0.5)",
                          cursor: "pointer",
                          transition: "width 0.3s ease",
                        }}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <div className="wrapper" style={{ padding: "0 20px 60px 20px", maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* 실시간 인기 게시글 목록 */}
        {selectedCategory === "all" && trendingPosts.length > 0 && (
          <div style={{ marginBottom: "40px", background: "var(--gh-surface-muted)", borderRadius: "12px", padding: "24px", border: "1px solid var(--gh-border)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "var(--gh-text)", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "6px" }}>
              🔥 지금 가장 많이 읽은 인기 글
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              {trendingPosts.map(function(tp) {
                const commentCount = tp.comments?.[0]?.count || 0;
                const likeCount = tp.post_likes?.[0]?.count || 0;
                return (
                  <Link
                    key={tp.id}
                    href={"/posts/" + tp.id}
                    style={{
                      background: "var(--gh-surface)",
                      borderRadius: "8px",
                      padding: "16px",
                      border: "1px solid var(--gh-border)",
                      textDecoration: "none",
                      color: "var(--gh-text)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      minHeight: "100px",
                      transition: "all 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: "bold", textTransform: "uppercase" }}>
                        {getCategoryLabel(tp.category, "ko")}
                      </span>
                      <h4 style={{ fontSize: "14px", fontWeight: "bold", margin: "4px 0 8px 0", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: "1.4" }}>
                        {tp.title}
                      </h4>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--gh-text-subtle)" }}>
                      <span>👁️ {tp.views || 0}</span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {commentCount > 0 && <span>💬 {commentCount}</span>}
                        {likeCount > 0 && <span>❤️ {likeCount}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 메인 카테고리 필터 및 정렬 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link
              href="/"
              style={{
                padding: "8px 18px",
                border: "none",
                background: selectedCategory === "all" ? "var(--gh-control-active)" : "var(--gh-surface-muted)",
                color: selectedCategory === "all" ? "var(--gh-control-active-text)" : "var(--gh-text-muted)",
                borderRadius: "20px",
                cursor: "pointer",
                fontWeight: selectedCategory === "all" ? "bold" : "normal",
                fontSize: "14px",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              전체
            </Link>

            {CATEGORIES.map(function(cat) {
              return (
                <Link
                  key={cat.value}
                  href={"/?category=" + cat.value}
                  style={{
                    padding: "8px 18px",
                    border: "none",
                    background: selectedCategory === cat.value ? "var(--gh-control-active)" : "var(--gh-surface-muted)",
                    color: selectedCategory === cat.value ? "var(--gh-control-active-text)" : "var(--gh-text-muted)",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontWeight: selectedCategory === cat.value ? "bold" : "normal",
                    fontSize: "14px",
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  {cat.label.ko}
                </Link>
              );
            })}
          </div>

          <Link href={selectedCategory && selectedCategory !== "all" ? `/posts/new?category=${selectedCategory}` : "/posts/new"}>
            <button
              style={{
                padding: "10px 20px",
                background: "var(--gh-control-active)",
                color: "var(--gh-control-active-text)",
                border: "none",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              글쓰기
            </button>
          </Link>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>게시글을 불러오는 중입니다...</p>
        ) : postsError ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--gh-text-muted)" }}>
            <p style={{ margin: "0 0 14px" }}>{postsError}</p>
            <button
              type="button"
              onClick={retryPosts}
              style={{
                padding: "8px 14px",
                background: "var(--gh-surface-muted)",
                color: "var(--gh-text)",
                border: "1px solid var(--gh-border)",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              다시 시도
            </button>
          </div>
        ) : posts.length === 0 ? (
          <p style={{ color: "#64748b", padding: "60px 0", textAlign: "center" }}>등록된 게시글이 없습니다.</p>
        ) : (
          <div className="main-post-list" style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px", minWidth: "600px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--gh-border)", background: "var(--gh-surface-muted)", color: "var(--gh-text)", textAlign: "left" }}>
                  <th style={{ padding: "14px" }}>카테고리</th>
                  <th style={{ padding: "14px" }}>제목</th>
                  <th style={{ padding: "14px" }}>지역</th>
                  <th style={{ padding: "14px" }}>작성자</th>
                  <th style={{ padding: "14px" }}>작성일</th>
                  <th style={{ padding: "14px", textAlign: "center" }}>조회/추천</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(function(post) {
                  const commentsCount = post.comments?.[0]?.count || 0;
                  const likesCount = post.post_likes?.[0]?.count || 0;
                  return (
                    <tr key={post.id} style={{ borderBottom: "1px solid var(--gh-border)" }}>
                      <td className="main-post-category" style={{ padding: "14px", fontSize: "14px", color: "var(--gh-text-muted)" }}>
                        {getCategoryLabel(post.category, "ko")}
                      </td>
                      <td className="main-post-title" style={{ padding: "14px" }}>
                        <Link href={"/posts/" + post.id} style={{ textDecoration: "none", color: "var(--gh-text)", fontWeight: "600" }}>
                          {post.title}
                        </Link>
                        {commentsCount > 0 && (
                          <span style={{ fontSize: "13px", color: "#ef4444", fontWeight: "bold", marginLeft: "6px" }}>
                            [{commentsCount}]
                          </span>
                        )}
                      </td>
                      <td className="main-post-region" style={{ padding: "14px", fontSize: "14px", color: "var(--gh-text-muted)" }}>
                        {shouldDisplayPostRegion(post.category, post.region) ? post.region : ""}
                      </td>
                      <td className="main-post-author" style={{ padding: "14px", fontSize: "14px", color: "var(--gh-text-muted)" }}>
                        {post.author_id ? (
                          <Link
                            href={"/profile/" + post.author_id}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              textDecoration: "none",
                              color: "var(--gh-text)",
                            }}
                          >
                            <div
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                background: "var(--gh-surface-muted)",
                                overflow: "hidden",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {post.author_avatar ? (
                                <img
                                  src={post.author_avatar}
                                  alt={post.author_name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <span style={{ fontSize: "12px" }}>👤</span>
                              )}
                            </div>
                            <span style={{ fontWeight: 500 }}>{post.author_name}</span>
                          </Link>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                background: "var(--gh-surface-muted)",
                                overflow: "hidden",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {post.author_avatar ? (
                                <img
                                  src={post.author_avatar}
                                  alt={post.author_name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <span style={{ fontSize: "12px" }}>👤</span>
                              )}
                            </div>
                            <span>{post.author_name}</span>
                          </div>
                        )}
                      </td>
                      <td className="main-post-date" style={{ padding: "14px", fontSize: "14px", color: "var(--gh-text-subtle)" }}>
                        {formatDate(post.created_at)}
                      </td>
                      <td className="main-post-views" style={{ padding: "14px", fontSize: "14px", color: "var(--gh-text-muted)", textAlign: "center" }}>
                        👁️ {post.views || 0} &nbsp;&nbsp; ❤️ {likesCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "100px", color: "#64748b" }}>로딩 중...</div>}>
      <HomeContent />
    </Suspense>
  );
}
