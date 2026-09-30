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

interface EngagementCount {
  count: number;
}

type Post = BasePost & {
  comments?: EngagementCount[] | null;
  post_likes?: EngagementCount[] | null;
};

interface NewsArticle {
  id: number;
  title: string;
  summary: string;
  image_url: string;
  link_url: string;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") || "all";

  const [posts, setPosts] = useState<Post[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [newsList, setNewsList] = useState<NewsArticle[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const selectedCategory = categoryParam;
  const [searchKeyword] = useState("");
  const [loadedCategory, setLoadedCategory] = useState<string | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [postsRetryKey, setPostsRetryKey] = useState(0);
  const loading = loadedCategory !== selectedCategory;

  useEffect(function() {
    let isCurrent = true;

    async function fetchNews() {
    const { data, error } = await supabase
      .from("news_articles")
      .select("*")
      .order("display_order", { ascending: true })
      .limit(10);

    if (!error && data && data.length > 0) {
      if (isCurrent) setNewsList(data);
    } else if (isCurrent) {
      setNewsList([
        {
          id: 1,
          title: "독일 대중교통 도이칠란트 티켓 최신 개정 및 이용 가이드",
          summary: "전국 근교 대중교통 이용 규정과 지역별 연계 혜택을 한눈에 정리했습니다.",
          image_url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1200&auto=format&fit=crop",
          link_url: "#",
        },
        {
          id: 2,
          title: "베를린·프랑크푸르트 한인 청년 및 유학생 네트워킹 데이 안내",
          summary: "현지 취업 및 정착 경험을 공유하는 교민 교류의 장이 열립니다.",
          image_url: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=1200&auto=format&fit=crop",
          link_url: "#",
        },
        {
          id: 3,
          title: "독일 현지 IT·스타트업 취업을 위한 영문·독문 레주메 작성법",
          summary: "독일 인사담당자가 눈여겨보는 포트폴리오 구성과 면접 대비 체크리스트.",
          image_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
          link_url: "#",
        },
        {
          id: 4,
          title: "주요 도시 보증금 및 월세 규정(Mietpreisbremse) 핵심 정리",
          summary: "안전한 주택 임대차 계약과 불합리한 월세 인상 대응 방안을 확인하세요.",
          image_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop",
          link_url: "#",
        },
        {
          id: 5,
          title: "프랑크푸르트·뮌헨 한독 문화 페스티벌 및 푸드 마켓 개최",
          summary: "전통 음식 체험과 다양한 문화 공연이 함께하는 주말 축제에 여러분을 초대합니다.",
          image_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200&auto=format&fit=crop",
          link_url: "#",
        },
        {
          id: 6,
          title: "독일 생활 필수 공적·사적 건강보험(Krankenkasse) 비교 분석",
          summary: "직장인과 프리랜서를 위한 보험 전환 기준과 가족 혜택 범위를 알아봅니다.",
          image_url: "https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=1200&auto=format&fit=crop",
          link_url: "#",
        },
      ]);
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
    fetchNews();
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
      return prev === newsList.length - 1 ? 0 : prev + 1;
    });
  };

  const prevSlide = function() {
    setCurrentSlide(function(prev) {
      return prev === 0 ? newsList.length - 1 : prev - 1;
    });
  };

  return (
    <main className="main-page">
      {newsList.length > 0 && (
        <section style={{ maxWidth: "1200px", margin: "30px auto", padding: "0 20px" }}>
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
              {newsList.map(function(news) {
                return (
                  <div
                    key={news.id}
                    style={{
                      minWidth: "100%",
                      height: "100%",
                      position: "relative",
                    }}
                  >
                    <img
                      src={news.image_url}
                      alt={news.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        opacity: 0.4,
                      }}
                    />
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
                      <h2 className="home-hero-title" style={{ fontSize: "32px", fontWeight: "bold", margin: "0 0 12px 0", lineHeight: "1.2" }}>
                        {news.title}
                      </h2>
                      <p style={{ fontSize: "15px", color: "#cbd5e1", margin: 0, maxWidth: "800px" }}>
                        {news.summary}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

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
              }}
            >
              {newsList.map(function(_, index) {
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
          </div>
        </section>
      )}

      <div className="wrapper" style={{ padding: "0 20px 60px 20px", maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* 실시간 인기 게시글 목록 */}
        {trendingPosts.length > 0 && (
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
