"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  CATEGORIES,
  EDUCATION_SUB_CATEGORY_OPTIONS,
  getCategoryLabel,
  getEducationSubCategoryLabel,
  shouldDisplayPostRegion,
} from "@/lib/constants";
import { formatDate } from "@/lib/date";
import { getBoardNotice } from "@/lib/board-notices";
import type { Post as BasePost } from "@/types/post";
import type { Article } from "@/types/article";
import AdSlot from "@/components/AdSlot";
import AuthorActionMenu from "@/components/AuthorActionMenu";
import CommunityIdentity from "@/components/CommunityIdentity";
import { fetchPublicCommunityIdentities, type PublicCommunityIdentityMap } from "@/lib/publicCommunityIdentity";

const POSTS_PER_PAGE = 20;

function getPaginationItems(currentPage: number, totalPages: number): Array<number | string> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const items: Array<number | string> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  if (start > 2) items.push("ellipsis-start");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < totalPages - 1) items.push("ellipsis-end");
  items.push(totalPages);
  return items;
}

interface EngagementCount {
  count: number;
}

type Post = BasePost & {
  comments?: EngagementCount[] | null;
  post_likes?: EngagementCount[] | null;
};



function HomeContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const isCommunityView = searchParams.get("section") === "community" || categoryParam !== null;

  const [posts, setPosts] = useState<Post[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [communityIdentities, setCommunityIdentities] = useState<PublicCommunityIdentityMap>({});
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
  const [articlesError, setArticlesError] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroTransitionEnabled, setHeroTransitionEnabled] = useState(true);
  const [mobileLiveIndex, setMobileLiveIndex] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [isMobileLivePaused, setIsMobileLivePaused] = useState(false);

  const selectedCategory = categoryParam || "all";
  const boardNotice = getBoardNotice(selectedCategory);
  const educationSubCategoryParam = searchParams.get("sub_category");
  const selectedEducationSubCategory = selectedCategory === "education" && EDUCATION_SUB_CATEGORY_OPTIONS.some((option) => option.value === educationSubCategoryParam)
    ? educationSubCategoryParam
    : null;
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState("");
  const staticFeedLoadedRef = useRef(false);
  const selectedFeedKey = selectedCategory + ":" + (selectedEducationSubCategory || "all") + ":" + currentPage;
  const [loadedCategory, setLoadedCategory] = useState<string | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [postsRetryKey, setPostsRetryKey] = useState(0);
  const loading = loadedCategory !== selectedFeedKey;

  useEffect(function() {
    setCurrentPage(1);
  }, [selectedCategory, selectedEducationSubCategory, debouncedSearchKeyword]);

  useEffect(function() {
    const timer = window.setTimeout(function() {
      setDebouncedSearchKeyword(searchKeyword.trim());
    }, 275);
    return function() { window.clearTimeout(timer); };
  }, [searchKeyword]);

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
        .select("*, comments(count), post_likes(count)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      if (selectedCategory === "education" && selectedEducationSubCategory) {
        query = query.eq("sub_category", selectedEducationSubCategory);
      }

      if (debouncedSearchKeyword) {
        const keyword = debouncedSearchKeyword;
        query = query.or("title.ilike.%" + keyword + "%,content.ilike.%" + keyword + "%");
      }

      const from = (currentPage - 1) * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;
      const { data, error, count } = await query.range(from, to).returns<Post[]>();
      if (error) {
        console.error("Posts fetch error:", error);
        if (isCurrent) {
          setPosts([]);
          setPostsError("게시글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        }
        return;
      }

      const pageCount = Math.max(1, Math.ceil((count || 0) / POSTS_PER_PAGE));
      if (isCurrent) setTotalPages(pageCount);
      if (currentPage > pageCount) {
        if (isCurrent) setCurrentPage(pageCount);
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

      const identityMap = await fetchPublicCommunityIdentities(authorIds);

      const postsWithAvatar: Post[] = postsData.map(function(p) {
        return {
          ...p,
          author_avatar: p.author_id ? avatarMap[p.author_id] || "" : "",
        };
      });

      if (isCurrent) {
        setPosts(postsWithAvatar);
        setCommunityIdentities(identityMap);
        setPostsError(null);
      }
      } catch (err) {
        console.error("Unexpected posts fetch error:", err);
        if (isCurrent) {
          setPosts([]);
          setPostsError("게시글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        }
      } finally {
        if (isCurrent) setLoadedCategory(selectedFeedKey);
      }
    }

    fetchPosts();
    if (!staticFeedLoadedRef.current) {
      Promise.allSettled([fetchFeaturedArticles(), fetchTrendingPosts()]).then(function() {
        if (isCurrent) staticFeedLoadedRef.current = true;
      });
    }

    return function() {
      isCurrent = false;
    };
  }, [postsRetryKey, debouncedSearchKeyword, selectedCategory, selectedEducationSubCategory, selectedFeedKey, currentPage]);

  useEffect(function() {
    const desktopMotion = window.matchMedia("(min-width: 769px) and (prefers-reduced-motion: no-preference)");
    if (isCommunityView || isHeroPaused || featuredArticles.length < 2 || !desktopMotion.matches) return;

    const timer = window.setInterval(function() {
      setCurrentSlide(function(previous) {
        return previous >= featuredArticles.length - 1 ? featuredArticles.length : previous + 1;
      });
    }, 6500);

    return function() {
      window.clearInterval(timer);
    };
  }, [featuredArticles.length, isCommunityView, isHeroPaused]);

  useEffect(function() {
    const mobileMotion = window.matchMedia("(max-width: 768px) and (prefers-reduced-motion: no-preference)");
    if (isCommunityView || isMobileLivePaused || featuredArticles.length < 2 || !mobileMotion.matches) return;

    const timer = window.setInterval(function() {
      setMobileLiveIndex(function(previous) {
        return (previous + 1) % featuredArticles.length;
      });
    }, 4200);

    return function() {
      window.clearInterval(timer);
    };
  }, [featuredArticles.length, isCommunityView, isMobileLivePaused]);

  const retryPosts = function() {
    setPostsError(null);
    setLoadedCategory(null);
    setPostsRetryKey(function(previous) {
      return previous + 1;
    });
  };

  const nextSlide = function() {
    setHeroTransitionEnabled(true);
    setCurrentSlide(function(prev) {
      return prev >= featuredArticles.length - 1 ? featuredArticles.length : prev + 1;
    });
  };

  const prevSlide = function() {
    setHeroTransitionEnabled(true);
    setCurrentSlide(function(prev) {
      return prev === 0 ? featuredArticles.length - 1 : Math.min(prev - 1, featuredArticles.length - 1);
    });
  };

  const activeHeroSlide = featuredArticles.length > 0 ? currentSlide % featuredArticles.length : 0;
  const heroSlides = featuredArticles.length > 1 ? [...featuredArticles, featuredArticles[0]] : featuredArticles;

  const handleHeroTransitionEnd = function() {
    if (featuredArticles.length < 2 || currentSlide !== featuredArticles.length) return;
    setHeroTransitionEnabled(false);
    setCurrentSlide(0);
    window.requestAnimationFrame(function() {
      window.requestAnimationFrame(function() { setHeroTransitionEnabled(true); });
    });
  };

  return (
    <main className="main-page">
      {!isCommunityView && !articlesError && featuredArticles.length > 0 && (
        <section className="info-news-section" style={{ maxWidth: "1200px", margin: "30px auto", padding: "0 20px" }}>
          <div className="info-section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "var(--gh-text)", margin: 0 }}>독일 주요 소식</h2>
            <Link href="/articles" style={{ color: "var(--gh-text-muted)", fontSize: "14px", textDecoration: "none", fontWeight: "500", borderRadius: "0" }}>
              전체 기사 보기 →
            </Link>
          </div>
          <div className="home-live-rail" aria-label="지금 올라온 독일 소식">
            <span className="home-live-label"><i aria-hidden="true" /> LIVE</span>
            <div className="home-live-window">
              <div className="home-live-track">
                {[...featuredArticles, ...featuredArticles].map(function(article, index) {
                  return <Link className="home-live-item" key={`${article.id}-${index}`} href={`/articles/${article.slug}`}>{article.title}<b aria-hidden="true">•</b></Link>;
                })}
              </div>
              <Link
                className="home-live-mobile-item"
                key={`mobile-live-${featuredArticles[mobileLiveIndex]?.id || mobileLiveIndex}`}
                href={`/articles/${featuredArticles[mobileLiveIndex]?.slug || featuredArticles[0].slug}`}
                onFocus={function() { setIsMobileLivePaused(true); }}
                onBlur={function() { setIsMobileLivePaused(false); }}
              >
                <span className="home-live-mobile-title">{featuredArticles[mobileLiveIndex]?.title || featuredArticles[0].title}</span>
                <span className="home-live-mobile-arrow" aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <div
            className="info-hero home-motion-hero"
            onMouseEnter={function() { setIsHeroPaused(true); }}
            onMouseLeave={function() { setIsHeroPaused(false); }}
            style={{
              position: "relative",
              borderRadius: "0",
              overflow: "hidden",
              background: "#0f172a",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
              height: "400px",
            }}
          >
            {featuredArticles.length > 1 && !isHeroPaused && (
              <div key={activeHeroSlide} className="home-hero-progress" aria-hidden="true" />
            )}
            <div
              onTransitionEnd={handleHeroTransitionEnd}
              style={{
                display: "flex",
                width: "100%",
                height: "100%",
                transform: "translateX(-" + (currentSlide * 100) + "%)",
                transition: heroTransitionEnabled ? "transform 0.5s ease-in-out" : "none",
              }}
            >
              {heroSlides.map(function(article, index) {
                return (
                  <Link
                    key={`${article.id}-${index}`}
                    href={"/articles/" + article.slug}
                    aria-hidden={currentSlide !== index}
                    tabIndex={currentSlide === index ? 0 : -1}
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
                        className={currentSlide === index ? "home-hero-image is-active" : "home-hero-image"}
                        src={article.image_url}
                        alt={article.title}
                        loading={index === 0 ? "eager" : "lazy"}
                        fetchPriority={index === 0 ? "high" : "auto"}
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
                          background: "linear-gradient(135deg, #26332e 0%, #151b18 100%)",
                        }}
                      />
                    )}
                    <div
                      className="info-hero-copy"
                      style={{
                        position: "absolute",
                        bottom: "50px",
                        left: "40px",
                        right: "40px",
                        color: "#fff",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: "bold", color: "var(--gh-accent)", textTransform: "uppercase", marginBottom: "8px", display: "inline-block", background: "rgba(0, 0, 0, 0.4)", padding: "2px 8px", borderRadius: "4px" }}>
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
                  className="info-hero-arrow info-hero-arrow-prev"
                  onClick={prevSlide}
                  aria-label="이전 주요 소식"
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
                  className="info-hero-arrow info-hero-arrow-next"
                  onClick={nextSlide}
                  aria-label="다음 주요 소식"
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
                        aria-label={`${index + 1}번째 주요 소식 보기`}
                        aria-current={activeHeroSlide === index ? "true" : undefined}
                        style={{
                          width: activeHeroSlide === index ? "24px" : "10px",
                          height: "10px",
                          borderRadius: "5px",
                          border: "none",
                          background: activeHeroSlide === index ? "var(--gh-accent)" : "rgba(255, 255, 255, 0.5)",
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

      {!isCommunityView && (
        <section className="info-hub-section" style={{ maxWidth: "1200px", margin: "0 auto 44px", padding: "0 20px" }}>
          <div className="info-hub-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
            <Link className="info-hub-card" href="/articles" style={{ textDecoration: "none", color: "var(--gh-text)", padding: "22px", border: "1px solid var(--gh-border)", borderRadius: "0", background: "var(--gh-surface)" }}>
              <div style={{ fontSize: "24px", marginBottom: "10px" }}>📰</div><strong style={{ fontSize: "17px" }}>독일 소식</strong><p style={{ margin: "7px 0 0", color: "var(--gh-text-muted)", fontSize: "13px", lineHeight: 1.6 }}>독일 생활에 직접 영향을 주는 주요 변화와 공식 발표</p>
            </Link>
            <Link className="info-hub-card" href="/guide" style={{ textDecoration: "none", color: "var(--gh-text)", padding: "22px", border: "1px solid var(--gh-border)", borderRadius: "0", background: "var(--gh-surface)" }}>
              <div style={{ fontSize: "24px", marginBottom: "10px" }}>📘</div><strong style={{ fontSize: "17px" }}>생활 가이드</strong><p style={{ margin: "7px 0 0", color: "var(--gh-text-muted)", fontSize: "13px", lineHeight: 1.6 }}>비자·세금·보험·주거·교육 등 독일 생활 핵심 정보</p>
            </Link>
            <Link className="info-hub-card" href="/messe" style={{ textDecoration: "none", color: "var(--gh-text)", padding: "22px", border: "1px solid var(--gh-border)", borderRadius: "0", background: "var(--gh-surface)" }}>
              <div style={{ fontSize: "24px", marginBottom: "10px" }}>🏢</div><strong style={{ fontSize: "17px" }}>독일 메세</strong><p style={{ margin: "7px 0 0", color: "var(--gh-text-muted)", fontSize: "13px", lineHeight: 1.6 }}>주요 전시회·박람회 일정과 출장·방문에 필요한 정보</p>
            </Link>
            <Link className="info-hub-card" href="/exchange" style={{ textDecoration: "none", color: "var(--gh-text)", padding: "22px", border: "1px solid var(--gh-border)", borderRadius: "0", background: "var(--gh-surface)" }}>
              <div style={{ fontSize: "24px", marginBottom: "10px" }}>💶</div><strong style={{ fontSize: "17px" }}>환율 · 계산기</strong><p style={{ margin: "7px 0 0", color: "var(--gh-text-muted)", fontSize: "13px", lineHeight: 1.6 }}>ECB 기준 EUR↔KRW 환율과 양방향 환율 계산기</p>
            </Link>
          </div>
        </section>
      )}

      {isCommunityView && (
      <div className={"wrapper community-home" + (selectedCategory !== "all" ? " community-home--category" : "")} style={{ padding: "30px 20px 60px 20px", maxWidth: "1200px", margin: "0 auto" }}>
        <section className="community-intro">
          <span className="community-kicker">GERMAN HANGUK COMMUNITY</span>
          <h1>독일에서 함께 사는 사람들의 이야기</h1>
          <p>질문하고, 경험을 나누고, 필요한 정보를 서로 찾아보세요.</p>
          <label className="community-search">
            <span aria-hidden="true">⌕</span>
            <input value={searchKeyword} onChange={function(e) { setSearchKeyword(e.target.value); }} placeholder="커뮤니티 글 검색" aria-label="커뮤니티 글 검색" />
          </label>
        </section>
        
        {/* 실시간 인기 게시글 목록 */}
        {selectedCategory === "all" && trendingPosts.length > 0 && (
          <div className="community-trending" style={{ marginBottom: "40px", background: "var(--gh-surface-muted)", borderRadius: "12px", padding: "24px", border: "1px solid var(--gh-border)" }}>
            <h3 className="community-trending-title" style={{ fontSize: "16px", fontWeight: "bold", color: "var(--gh-text)", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="community-trending-flame">🔥</span> 지금 가장 많이 읽은 인기 글
            </h3>
            <div className="community-trending-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              {trendingPosts.map(function(tp) {
                const commentCount = tp.comments?.[0]?.count || 0;
                const likeCount = tp.post_likes?.[0]?.count || 0;
                return (
                  <Link
                    className="community-trending-card"
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
                      <span className="community-category-accent" style={{ fontSize: "11px", color: "var(--gh-accent)", fontWeight: "bold", textTransform: "uppercase" }}>
                        {getCategoryLabel(tp.category, "ko")}
                      </span>
                      <h4 style={{ fontSize: "14px", fontWeight: "bold", margin: "4px 0 8px 0", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: "1.4" }}>
                        {tp.title}
                      </h4>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--gh-text-subtle)" }}>
                      <span><span className="community-metric-emoji">👁️</span> {tp.views || 0}</span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {commentCount > 0 && <span><span className="community-metric-emoji">💬</span> {commentCount}</span>}
                        {likeCount > 0 && <span><span className="community-metric-emoji">♥</span> {likeCount}</span>}
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
              href="/?section=community"
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
                  href={"/?section=community&category=" + cat.value}
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

          <Link
            href={selectedCategory && selectedCategory !== "all" ? `/posts/new?category=${selectedCategory}` : "/posts/new"}
            style={{ display: "inline-block" }}
          >
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

        {selectedCategory === "education" && (
          <div className="education-community-topics" style={{ margin: "-4px 0 22px", padding: "16px 18px", border: "1px solid var(--gh-border)", background: "var(--gh-surface)", borderRadius: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "10px" }}>
              <div>
                <strong style={{ color: "var(--gh-text)", fontSize: "14px" }}>🎓 유학생 코너</strong>
                <span style={{ marginLeft: "8px", color: "var(--gh-text-subtle)", fontSize: "12px" }}>준비부터 학교생활·졸업까지, 같은 상황의 경험을 모아보세요.</span>
              </div>
              <Link href="/posts/new?category=education&sub_category=student-diary" style={{ color: "var(--gh-accent)", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}>
                유학생 일기 쓰기 →
              </Link>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Link href="/?section=community&category=education" style={{ padding: "6px 10px", borderRadius: "14px", textDecoration: "none", fontSize: "12px", background: !selectedEducationSubCategory ? "var(--gh-control-active)" : "var(--gh-surface-muted)", color: !selectedEducationSubCategory ? "var(--gh-control-active-text)" : "var(--gh-text-muted)" }}>전체</Link>
              {EDUCATION_SUB_CATEGORY_OPTIONS.map(function(option) {
                return (
                  <Link key={option.value} href={"/?section=community&category=education&sub_category=" + option.value} style={{ padding: "6px 10px", borderRadius: "14px", textDecoration: "none", fontSize: "12px", background: selectedEducationSubCategory === option.value ? "var(--gh-control-active)" : "var(--gh-surface-muted)", color: selectedEducationSubCategory === option.value ? "var(--gh-control-active-text)" : "var(--gh-text-muted)" }}>
                    {option.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

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
        ) : posts.length === 0 && !isCommunityView ? (
          <p style={{ color: "#64748b", padding: "60px 0", textAlign: "center" }}>등록된 게시글이 없습니다.</p>
        ) : (
          <div className="main-post-list" style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px", minWidth: "600px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--gh-border)", background: "var(--gh-surface-muted)", color: "var(--gh-text)", textAlign: "left" }}>
                  <th style={{ padding: "14px" }}>카테고리</th>
                  <th style={{ padding: "14px" }}>제목</th>
                  {selectedCategory !== "community" && <th style={{ padding: "14px" }}>지역</th>}
                  <th style={{ padding: "14px" }}>작성자</th>
                  <th style={{ padding: "14px" }}>작성일</th>
                  <th style={{ padding: "14px", textAlign: "center" }}>조회/추천</th>
                </tr>
              </thead>
              <tbody>
                {isCommunityView && (
                  <tr className="board-notice-row" style={{ borderBottom: "1px solid var(--gh-border)", background: "var(--gh-surface-muted)" }}>
                    <td className="main-post-category" style={{ padding: "14px", fontSize: "13px", fontWeight: 800, color: "var(--gh-accent)" }}>[공지]</td>
                    <td className="main-post-title" style={{ padding: "14px" }}>
                      <Link href={"/notices/" + boardNotice.category} style={{ textDecoration: "none", color: "var(--gh-text)", fontWeight: 800 }}>
                        {boardNotice.title}
                      </Link>
                    </td>
                    {selectedCategory !== "community" && <td className="main-post-region" style={{ padding: "14px" }} />}
                    <td className="main-post-author" style={{ padding: "14px", fontSize: "14px", color: "var(--gh-text-muted)", fontWeight: 700 }}>관리자</td>
                    <td className="main-post-date" style={{ padding: "14px", fontSize: "13px", color: "var(--gh-text-subtle)" }}>2026. 10. 2.</td>
                    <td className="main-post-views" style={{ padding: "14px", fontSize: "13px", color: "var(--gh-text-subtle)", textAlign: "center" }}>—</td>
                  </tr>
                )}
                {posts.map(function(post) {
                  const commentsCount = post.comments?.[0]?.count || 0;
                  const likesCount = post.post_likes?.[0]?.count || 0;
                  return (
                    <tr key={post.id} style={{ borderBottom: "1px solid var(--gh-border)" }}>
                      <td className="main-post-category" style={{ padding: "14px", fontSize: "14px", color: "var(--gh-text-muted)" }}>
                        {post.category === "education" ? getEducationSubCategoryLabel(post.sub_category) : getCategoryLabel(post.category, "ko")}
                      </td>
                      <td className="main-post-title" style={{ padding: "14px" }}>
                        <Link href={"/posts/" + post.id} style={{ textDecoration: "none", color: "var(--gh-text)", fontWeight: "600" }}>
                          {post.title}
                        </Link>
                        {commentsCount > 0 && (
                          <span className="community-comment-count" style={{ fontSize: "13px", color: "var(--gh-alert, #a86f68)", fontWeight: "bold", marginLeft: "6px" }}>
                            [{commentsCount}]
                          </span>
                        )}
                      </td>
                      {selectedCategory !== "community" && (
                        <td className="main-post-region" style={{ padding: "14px", fontSize: "14px", color: "var(--gh-text-muted)" }}>
                          {shouldDisplayPostRegion(post.category, post.region) ? post.region : ""}
                        </td>
                      )}
                      <td className="main-post-author" style={{ padding: "14px", fontSize: "14px", color: "var(--gh-text-muted)" }}>
                        {post.author_id ? (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px" }}>
                            <AuthorActionMenu
                              authorId={post.author_id}
                              authorName={post.author_name}
                              avatarUrl={post.author_avatar}
                            />
                            {communityIdentities[post.author_id] && (
                              <CommunityIdentity
                                xp={communityIdentities[post.author_id].reputation_xp}
                                tenureValue={communityIdentities[post.author_id].tenure_value}
                                tenureUnit={communityIdentities[post.author_id].tenure_unit}
                                showLevel={communityIdentities[post.author_id].show_community_level}
                                showTenure={communityIdentities[post.author_id].show_germany_tenure}
                                compact
                              />
                            )}
                          </div>
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
                        <span className="main-post-stats" aria-label={`ì¡°íšŒ ${post.views || 0}, ì¢‹ì•„ìš” ${likesCount}`}>
                          <span className="main-post-stat"><span aria-hidden="true">&#128065;&#65039;</span><span>{post.views || 0}</span></span>
                          <span className="main-post-stat"><span aria-hidden="true">&#10084;&#65039;</span><span>{likesCount}</span></span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
              <nav className="board-pagination" aria-label="게시글 페이지 이동">
                <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} aria-label="이전 페이지">‹</button>
                {getPaginationItems(currentPage, totalPages).map(function(item) {
                  if (typeof item === "string") return <span key={item} className="board-pagination-ellipsis">…</span>;
                  return (
                    <button key={item} type="button" className={item === currentPage ? "is-active" : ""} aria-current={item === currentPage ? "page" : undefined} onClick={() => setCurrentPage(item)}>
                      {item}
                    </button>
                  );
                })}
                <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} aria-label="다음 페이지">›</button>
              </nav>
            )}
          </div>
        )}
        
        {/* 게시글 목록 하단 광고 영역 */}
        <AdSlot position="board-bottom" />
      </div>
      )}
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
