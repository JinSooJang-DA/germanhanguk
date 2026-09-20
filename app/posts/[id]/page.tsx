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
  author_avatar?: string;
  created_at: string;
  views: number;
}

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
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

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 댓글 수정 관련 상태
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [updatingComment, setUpdatingComment] = useState(false);

  const [bottomPosts, setBottomPosts] = useState<Post[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    setCurrentPage(pageParam);
  }, [searchParams]);

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      const { data: postData } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (postData) {
        const nextViews = (postData.views || 0) + 1;

        await supabase
          .from("posts")
          .update({ views: nextViews })
          .eq("id", id);

        let authorAvatar = "";
        if (postData.author_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url, display_name")
            .eq("id", postData.author_id)
            .single();

          if (profile?.avatar_url) {
            authorAvatar = profile.avatar_url;
          }
        }

        setPost({
          ...postData,
          views: nextViews,
          author_avatar: authorAvatar,
        });

        fetchBottomPosts(currentPage, postData.category);
      }

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

    if (data) {
      const authorIds = Array.from(new Set(data.map((c) => c.author_id).filter(Boolean)));
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

      const commentsWithAvatar = data.map((c) => ({
        ...c,
        author_avatar: avatarMap[c.author_id] || "",
      }));

      setComments(commentsWithAvatar);
    }
  }

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

  function handleStartEditComment(comment: Comment) {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  }

  function handleCancelEditComment() {
    setEditingCommentId(null);
    setEditingCommentContent("");
  }

  async function handleSaveEditComment(commentId: string) {
    if (!editingCommentContent.trim()) {
      alert("댓글 내용을 입력해 주세요.");
      return;
    }

    setUpdatingComment(true);

    const { error } = await supabase
      .from("comments")
      .update({ content: editingCommentContent.trim() })
      .eq("id", commentId);

    setUpdatingComment(false);

    if (error) {
      alert("댓글 수정 실패: " + error.message);
      return;
    }

    setEditingCommentId(null);
    setEditingCommentContent("");
    fetchComments();
  }

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
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
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
                <span style={{ fontSize: "16px" }}>👤</span>
              )}
            </div>
            <div>
              <span style={{ fontWeight: "bold", color: "#222" }}>
                {post.author_name}
              </span>
              <span style={{ marginLeft: "12px", color: "#94a3b8" }}>
                👁️ 조회 {post.views || 0}회
              </span>
            </div>
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
              comments.map((comment) => {
                const isCommentAuthor = currentUserId === comment.author_id;
                const isEditing = editingCommentId === comment.id;

                return (
                  <div
                    key={comment.id}
                    style={{
                      padding: "16px",
                      background: "#f9f9f9",
                      borderRadius: "6px",
                      display: "flex",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "#e2e8f0",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {comment.author_avatar ? (
                        <img
                          src={comment.author_avatar}
                          alt={comment.author_name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ fontSize: "14px" }}>👤</span>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
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
                          {isCommentAuthor && !isEditing && (
                            <>
                              <button
                                onClick={() => handleStartEditComment(comment)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#2563eb",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  padding: 0,
                                }}
                              >
                                수정
                              </button>
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
                            </>
                          )}
                        </div>
                      </div>

                      {/* 댓글 본문 및 인라인 수정 모드 */}
                      {isEditing ? (
                        <div style={{ marginTop: "8px" }}>
                          <textarea
                            value={editingCommentContent}
                            onChange={(e) => setEditingCommentContent(e.target.value)}
                            rows={3}
                            style={{
                              width: "100%",
                              padding: "10px",
                              border: "1px solid #cbd5e1",
                              borderRadius: "4px",
                              fontSize: "14px",
                              resize: "vertical",
                              boxSizing: "border-box",
                            }}
                          />
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
                            <button
                              onClick={handleCancelEditComment}
                              disabled={updatingComment}
                              style={{
                                padding: "4px 10px",
                                background: "#94a3b8",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              취소
                            </button>
                            <button
                              onClick={() => handleSaveEditComment(comment.id)}
                              disabled={updatingComment}
                              style={{
                                padding: "4px 10px",
                                background: "#2563eb",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              {updatingComment ? "저장 중..." : "저장"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: "15px", whiteSpace: "pre-wrap" }}>{comment.content}</p>
                      )}
                    </div>
                  </div>
                );
              })
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