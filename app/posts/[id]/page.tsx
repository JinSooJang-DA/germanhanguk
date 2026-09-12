"use client";

import { useEffect, useState, use, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  region: string;
  author_id: string;
  author_name: string;
  created_at: string;
  views: number;
}

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

const CATEGORIES = [
  { label: "전체", value: "all" },
  { label: "커뮤니티", value: "community" },
  { label: "생활정보", value: "life" },
  { label: "중고장터", value: "market" },
  { label: "구인구직", value: "jobs" },
  { label: "행사", value: "events" },
];

const PAGE_SIZE = 10;

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  // 게시글 & 댓글 상태
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 하단 게시글 목록 & 페이지네이션 상태
  const [bottomPosts, setBottomPosts] = useState<Post[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    setCurrentPage(pageParam);
  }, [searchParams]);

  useEffect(() => {
    async function fetchData() {
      // 1. 현재 사용자 정보
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      // 2. 게시글 상세 정보 먼저 조회
      const { data: postData } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (postData) {
        const nextViews = (postData.views || 0) + 1;

        // 3. DB에 조회수 1 증가 업데이트
        await supabase
          .from("posts")
          .update({ views: nextViews })
          .eq("id", id);

        // 화면 상태 반영
        setPost({ ...postData, views: nextViews });

        // 하단 동일 카테고리 목록 불러오기
        fetchBottomPosts(currentPage, postData.category);
      }

      // 4. 댓글 목록 조회
      fetchComments();

      setLoading(false);
    }

    fetchData();
  }, [id, currentPage]);

  async function fetchBottomPosts(page: number, category: string) {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { count } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("category", category);

    if (count !== null) {
      setTotalPages(Math.ceil(count / PAGE_SIZE) || 1);
    }

    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("category", category)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data) {
      setBottomPosts(data);
    }
  }

  async function fetchComments() {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", id)
      .order("created_at", { ascending: true });

    if (data) setComments(data);
  }

  // 게시글 삭제
  async function handleDeletePost() {
    if (!confirm("정말로 이 게시글을 삭제하시겠습니까?")) return;

    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) {
      alert("삭제 실패: " + error.message);
      return;
    }
    alert("삭제되었습니다.");
    router.push("/");
    router.refresh();
  }

  // 댓글 등록
  async function handleCommentSubmit(e: FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("로그인이 필요합니다.");
      router.push("/auth");
      return;
    }

    setSubmitting(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const authorName = profile?.display_name || user.email?.split("@")[0] || "회원";

    const { error } = await supabase.from("comments").insert({
      post_id: id,
      author_id: user.id,
      author_name: authorName,
      content: newComment,
    });

    setSubmitting(false);

    if (error) {
      alert("댓글 작성 실패: " + error.message);
      return;
    }

    setNewComment("");
    fetchComments();
  }

  // 댓글 삭제
  async function handleDeleteComment(commentId: string) {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;

    const { error } = await supabase.from("comments").delete().eq("id", commentId);

    if (error) {
      alert("삭제 실패: " + error.message);
      return;
    }

    fetchComments();
  }

  if (loading) {
    return (
      <main className="post-detail">
        <div className="wrapper">
          <p>게시글을 불러오는 중입니다...</p>
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="post-detail">
        <div className="wrapper">
          <p>게시글을 찾을 수 없습니다.</p>
          <Link href="/" className="back-link">
            ← 목록으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  const isAuthor = currentUserId === post.author_id;
  const currentCategoryLabel =
    CATEGORIES.find((c) => c.value === post.category)?.label || post.category;

  return (
    <main className="post-detail">
      <div className="wrapper">
        <Link href="/" className="back-link">
          ← 목록으로 돌아가기
        </Link>

        <div className="post-meta">
          <span>[{currentCategoryLabel}]</span>
          {post.region && <span>{post.region}</span>}
          <span>{new Date(post.created_at).toLocaleDateString()}</span>
        </div>

        <h1>{post.title}</h1>

        <div
          className="post-author"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            fontSize: "14px",
            color: "#666",
          }}
        >
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <span style={{ fontWeight: "bold", color: "#222" }}>
              작성자: {post.author_name}
            </span>
            <span>👁️ 조회 {post.views || 0}회</span>
          </div>

          {isAuthor && (
            <div style={{ display: "flex", gap: "8px" }}>
              <Link href={`/posts/${post.id}/edit`}>
                <button
                  style={{
                    padding: "6px 12px",
                    background: "#475569",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  수정
                </button>
              </Link>
              <button
                onClick={handleDeletePost}
                style={{
                  padding: "6px 12px",
                  background: "#e53e3e",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                삭제
              </button>
            </div>
          )}
        </div>

        <div className="post-content">{post.content}</div>

        {/* 댓글 섹션 */}
        <div style={{ marginTop: "60px", paddingTop: "30px", borderTop: "1px solid #eee" }}>
          <h3>댓글 ({comments.length})</h3>

          <form onSubmit={handleCommentSubmit} style={{ marginTop: "20px", marginBottom: "30px" }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={currentUserId ? "댓글을 남겨보세요..." : "로그인 후 댓글을 남길 수 있습니다."}
              disabled={!currentUserId || submitting}
              rows={3}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "14px",
                resize: "vertical",
              }}
              required
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="submit"
                disabled={!currentUserId || submitting}
                style={{
                  padding: "8px 18px",
                  background: currentUserId ? "#222" : "#ccc",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: currentUserId ? "pointer" : "not-allowed",
                }}
              >
                {submitting ? "등록 중..." : "댓글 등록"}
              </button>
            </div>
          </form>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {comments.length === 0 ? (
              <p style={{ color: "#888", fontSize: "14px" }}>첫 번째 댓글을 달아보세요!</p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    padding: "16px",
                    background: "#f9f9f9",
                    borderRadius: "6px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                      fontSize: "13px",
                      color: "#666",
                    }}
                  >
                    <span style={{ fontWeight: "bold", color: "#222" }}>{comment.author_name}</span>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <span>{new Date(comment.created_at).toLocaleString()}</span>
                      {currentUserId === comment.author_id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#e53e3e",
                            fontSize: "12px",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: "15px", whiteSpace: "pre-wrap" }}>{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 하단 동일 카테고리 게시글 목록 */}
        <div style={{ marginTop: "60px", paddingTop: "30px", borderTop: "2px solid #0f172a" }}>
          <h3 style={{ marginBottom: "16px", fontSize: "18px", color: "#0f172a" }}>
            '{currentCategoryLabel}' 카테고리 다른 글
          </h3>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ddd", background: "#f8f9fa", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontSize: "14px" }}>카테고리</th>
                <th style={{ padding: "10px 12px", fontSize: "14px" }}>제목</th>
                <th style={{ padding: "10px 12px", fontSize: "14px" }}>지역</th>
                <th style={{ padding: "10px 12px", fontSize: "14px" }}>작성자</th>
                <th style={{ padding: "10px 12px", fontSize: "14px" }}>작성일</th>
                <th style={{ padding: "10px 12px", fontSize: "14px", textAlign: "center" }}>조회</th>
              </tr>
            </thead>
            <tbody>
              {bottomPosts.map((p) => {
                const isCurrent = String(p.id) === String(post.id);
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid #eee",
                      background: isCurrent ? "#eff6ff" : "transparent",
                    }}
                  >
                    <td style={{ padding: "10px 12px", fontSize: "13px", color: "#666" }}>
                      {CATEGORIES.find((c) => c.value === p.category)?.label || p.category}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <Link
                        href={`/posts/${p.id}?page=${currentPage}`}
                        style={{
                          textDecoration: "none",
                          color: isCurrent ? "#2563eb" : "#222",
                          fontWeight: isCurrent ? "bold" : "normal",
                          fontSize: "14px",
                        }}
                      >
                        {p.title} {isCurrent && "◀ (현재글)"}
                      </Link>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: "13px", color: "#666" }}>{p.region || "-"}</td>
                    <td style={{ padding: "10px 12px", fontSize: "13px", color: "#666" }}>{p.author_name}</td>
                    <td style={{ padding: "10px 12px", fontSize: "13px", color: "#888" }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: "13px", color: "#888", textAlign: "center" }}>
                      {p.views || 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 하단 페이지네이션 */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "6px",
                marginTop: "20px",
              }}
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    background: currentPage === pageNum ? "#0f172a" : "#fff",
                    color: currentPage === pageNum ? "#fff" : "#334155",
                    fontWeight: currentPage === pageNum ? "bold" : "normal",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  {pageNum}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}