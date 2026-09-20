"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Post {
  id: number;
  title: string;
  content: string;
  category: string;
  region: string;
  author_id?: string;
  author_name: string;
  author_avatar?: string;
  created_at: string;
}

interface NewsArticle {
  id: number;
  title: string;
  summary: string;
  image_url: string;
  link_url: string;
}

const CATEGORIES = [
  { label: "전체", value: "all" },
  { label: "커뮤니티", value: "community" },
  { label: "유학·교육", value: "education" },
  { label: "생활정보", value: "life" },
  { label: "중고장터", value: "market" },
  { label: "구인구직", value: "jobs" },
  { label: "행사", value: "events" },
];

function HomeContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") || "all";

  const [posts, setPosts] = useState<Post[]>([]);
  const [newsList, setNewsList] = useState<NewsArticle[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSelectedCategory(categoryParam);
  }, [categoryParam]);

  useEffect(() => {
    fetchPosts();
    fetchNews();
  }, [selectedCategory]);

  async function fetchNews() {
    const { data, error } = await supabase
      .from("news_articles")
      .select("*")
      .order("display_order", { ascending: true })
      .limit(10);

    if (!error && data && data.length > 0) {
      setNewsList(data);
    } else {
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

  async function fetchPosts() {
    setLoading(true);
    let query = supabase.from("posts").select("*").order("created_at", { ascending: false });

    if (selectedCategory !== "all") {
      query = query.eq("category", selectedCategory);
    }

    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim();
      query = query.or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`);
    }

    const { data, error } = await query;
    if (!error && data) {
      // 작성자들의 아바타 매핑 가져오기
      const authorIds = Array.from(new Set(data.map((p) => p.author_id).filter(Boolean)));
      let avatarMap: Record<string, string> = {};

      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, avatar_url")
          .in("id", authorIds);

        if (profiles) {
          profiles.forEach((p) => {
            if (p.avatar_url) avatarMap[p.id] = p.avatar_url;
          });
        }
      }

      const postsWithAvatar = data.map((p) => ({
        ...p,
        author_avatar: p.author_id ? avatarMap[p.author_id] || "" : "",
      }));

      setPosts(postsWithAvatar);
    }
    setLoading(false);
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === newsList.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? newsList.length - 1 : prev - 1));
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
                width: `${newsList.length * 100}%`,
                transform: `translateX(-${(currentSlide * 100) / newsList.length}%)`,
                transition: "transform 0.5s ease-in-out",
                height: "100%",
              }}
            >
              {newsList.map((news) => (
                <div
                  key={news.id}
                  style={{
                    width: `${100 / newsList.length}%`,
                    height: "100%",
                    position: "relative",
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  <img
                    src={news.image_url}
                    alt={news.title}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: "brightness(0.65)",
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      padding: "40px",
                      background: "linear-gradient(to top, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.4) 60%, transparent 100%)",
                      width: "100%",
                      color: "#fff",
                    }}
                  >
                    <span style={{ background: "#2563eb", padding: "4px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                      Editor's Pick
                    </span>
                    <h2 style={{ fontSize: "26px", fontWeight: "bold", margin: "12px 0 8px 0" }}>
                      <a href={news.link_url} style={{ color: "#fff", textDecoration: "none" }}>
                        {news.title}
                      </a>
                    </h2>
                    <p style={{ fontSize: "15px", color: "#cbd5e1", margin: 0, maxWidth: "800px" }}>
                      {news.summary}
                    </p>
                  </div>
                </div>
              ))}
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
              {newsList.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
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
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="wrapper" style={{ padding: "0 20px 60px 20px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={`/?category=${cat.value}`}
                style={{
                  padding: "8px 18px",
                  border: "none",
                  background: selectedCategory === cat.value ? "#0f172a" : "#f1f5f9",
                  color: selectedCategory === cat.value ? "#fff" : "#475569",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontWeight: selectedCategory === cat.value ? "bold" : "normal",
                  fontSize: "14px",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                {cat.label}
              </Link>
            ))}
          </div>

          <Link href="/posts/new">
            <button
              style={{
                padding: "10px 20px",
                background: "#0f172a",
                color: "#fff",
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
        ) : posts.length === 0 ? (
          <p style={{ color: "#64748b", padding: "60px 0", textAlign: "center" }}>등록된 게시글이 없습니다.</p>
        ) : (
          <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px", minWidth: "600px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc", textAlign: "left" }}>
                  <th style={{ padding: "14px" }}>카테고리</th>
                  <th style={{ padding: "14px" }}>제목</th>
                  <th style={{ padding: "14px" }}>지역</th>
                  <th style={{ padding: "14px" }}>작성자</th>
                  <th style={{ padding: "14px" }}>작성일</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px", fontSize: "14px", color: "#64748b" }}>
                      {CATEGORIES.find((c) => c.value === post.category)?.label || post.category}
                    </td>
                    <td style={{ padding: "14px" }}>
                      <Link href={`/posts/${post.id}`} style={{ textDecoration: "none", color: "#0f172a", fontWeight: "500" }}>
                        {post.title}
                      </Link>
                    </td>
                    <td style={{ padding: "14px", fontSize: "14px", color: "#64748b" }}>{post.region || "-"}</td>
                    <td style={{ padding: "14px", fontSize: "14px", color: "#64748b" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: "#e2e8f0",
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
                    </td>
                    <td style={{ padding: "14px", fontSize: "14px", color: "#94a3b8" }}>
                      {new Date(post.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
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