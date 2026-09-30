"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Post, Comment } from "@/types/post";
import { getCategoryLabel } from "@/lib/constants";
import { VIEW_INCREMENT_EVENT } from "@/components/PostViewCount";

const PAGE_SIZE = 10;
const VIEW_COUNT_DEDUPLICATION_MS = 30 * 60 * 1000;

interface PostDetailClientProps {
  id: string;
  initialPost: Post;
  initialComments: Comment[];
  initialUserId: string | null;
}

export default function PostDetailClient({
  id,
  initialPost,
  initialComments,
  initialUserId,
}: PostDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [post, setPost] = useState<Post>(initialPost);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(initialUserId);
  const [submitting, setSubmitting] = useState(false);

  // 댓글 수정 관련 상태
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [updatingComment, setUpdatingComment] = useState(false);

  // 좋아요 관련 상태
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  // 대댓글 관련 상태
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const [bottomPosts, setBottomPosts] = useState<Post[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
      setBottomPosts(data as unknown as Post[]);
    }
  }

  async function fetchComments() {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", parseInt(id, 10))
      .order("created_at", { ascending: true });

    if (data) {
      const authorIds = Array.from(new Set(data.map(function(c) { return c.author_id; }).filter(Boolean)));
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

      // 평탄형(flat) 댓글 데이터를 부모-자식 트리 구조로 매핑 (1단계 깊이 제한 적용)
      const rootComments: Comment[] = [];
      const replyMap: Record<string, Comment[]> = {};

      data.forEach(function(c) {
        const commentWithAvatar: Comment = {
          ...c,
          author_avatar: avatarMap[c.author_id] || null,
          replies: []
        };

        if (!c.parent_id) {
          rootComments.push(commentWithAvatar);
        } else {
          let targetParentId = c.parent_id;
          const parentComment = data.find(function(pc) { return pc.id === targetParentId; });
          if (parentComment && parentComment.parent_id) {
            targetParentId = parentComment.parent_id;
          }

          if (!replyMap[targetParentId]) {
            replyMap[targetParentId] = [];
          }
          replyMap[targetParentId].push(commentWithAvatar);
        }
      });

      rootComments.forEach(function(rc) {
        rc.replies = replyMap[rc.id] || [];
      });

      setComments(rootComments);
    }
  }

  useEffect(function() {
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    setCurrentPage(pageParam);
  }, [searchParams]);

  useEffect(function() {
    async function loadSessionAndLikes() {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      setCurrentUserId(userId);

      // 좋아요 개수 및 로그인 사용자 클릭 여부 조회
      let initialLikesCount = 0;
      let initialIsLiked = false;

      const { count: countLikes, error: likesError } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", parseInt(id, 10));

      if (!likesError && countLikes !== null) {
        initialLikesCount = countLikes;
      }

      if (userId) {
        const { data: userLike } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", parseInt(id, 10))
          .eq("user_id", userId)
          .maybeSingle();

        if (userLike) {
          initialIsLiked = true;
        }
      }

      setLikesCount(initialLikesCount);
      setIsLiked(initialIsLiked);
    }

    loadSessionAndLikes();
    fetchBottomPosts(currentPage, post.category);
  }, [id, currentPage, post.category]);

  useEffect(function() {
    // Safe, atomic view increment via RPC (실패해도 렌더링에 영향 없도록 안전처리)
    async function incrementView() {
      const postId = Number.parseInt(id, 10);

      if (!Number.isSafeInteger(postId) || postId <= 0) {
        console.error("Invalid post id:", id);
        return;
      }

      // 일반 사용자의 새로고침 중복 집계 완화용이며 보안 또는 악용 방어 수단이 아닙니다.
      const storageKey = "post-view-counted:" + postId;
      try {
        const lastCountedAt = Number(localStorage.getItem(storageKey));
        if (Number.isFinite(lastCountedAt) && Date.now() - lastCountedAt < VIEW_COUNT_DEDUPLICATION_MS) {
          return;
        }
      } catch (err) {
        console.warn("View count localStorage read error:", err);
      }

      try {
        const { error } = await supabase.rpc("increment_page_view", { post_id: postId });

        if (error) {
          console.error("View increment RPC error:", error);
          return;
        }

        if (process.env.NODE_ENV === "development") {
          console.log("View increment RPC success:", postId);
        }

        try {
          localStorage.setItem(storageKey, String(Date.now()));
        } catch (err) {
          console.warn("View count localStorage write error:", err);
        }

        window.dispatchEvent(new CustomEvent(VIEW_INCREMENT_EVENT, { detail: { postId } }));
      } catch (err) {
        console.error("View increment RPC error:", err);
      }
    }
    incrementView();
  }, [id]);





  async function handleDeletePost() {
    if (!confirm("정말로 이 게시글을 삭제하시겠습니까?")) return;

    const { error } = await supabase.from("posts").delete().eq("id", parseInt(id, 10));
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

    const { data: { user } } = await supabase.auth.getUser();
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
      post_id: parseInt(id, 10),
      author_id: user.id,
      author_name: authorName,
      content: newComment.trim(),
    });

    setSubmitting(false);

    if (error) {
      alert("댓글 작성 실패: " + error.message);
      return;
    }

    setNewComment("");
    fetchComments();
  }

  async function handleReplySubmit(e: FormEvent, parentId: string) {
    e.preventDefault();
    if (!replyContent.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
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
      post_id: parseInt(id, 10),
      parent_id: parentId,
      author_id: user.id,
      author_name: authorName,
      content: replyContent.trim(),
    });

    setSubmitting(false);

    if (error) {
      alert("답글 작성 실패: " + error.message);
      return;
    }

    setReplyContent("");
    setReplyingToId(null);
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

  async function handleLikeToggle() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("로그인이 필요한 서비스입니다.");
      router.push("/auth");
      return;
    }

    const prevIsLiked = isLiked;
    const prevLikesCount = likesCount;

    // 낙관적 업데이트 적용
    setIsLiked(!prevIsLiked);
    setLikesCount(prevIsLiked ? prevLikesCount - 1 : prevLikesCount + 1);

    if (prevIsLiked) {
      // 좋아요 해제 (DELETE)
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", parseInt(id, 10))
        .eq("user_id", user.id);

      if (error) {
        console.error("Unlike failed:", error);
        setIsLiked(prevIsLiked);
        setLikesCount(prevLikesCount);
        alert("좋아요 취소에 실패했습니다: " + error.message);
      }
    } else {
      // 좋아요 추가 (INSERT)
      const { error } = await supabase
        .from("post_likes")
        .insert({
          post_id: parseInt(id, 10),
          user_id: user.id,
        });

      if (error) {
        console.error("Like failed:", error);
        setIsLiked(prevIsLiked);
        setLikesCount(prevLikesCount);
        alert("좋아요 반영에 실패했습니다: " + error.message);
      }
    }
  }

  const isAuthor = currentUserId === post.author_id;
  const currentCategoryLabel = getCategoryLabel(post.category, "ko");

  return (
    <div>
      {/* 좋아요 버튼 영역 */}
      <div style={{ display: "flex", justifyContent: "center", margin: "40px 0" }}>
        <button
          onClick={handleLikeToggle}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 24px",
            background: isLiked ? "#fff" : "#f1f5f9",
            border: isLiked ? "2px solid #ef4444" : "1px solid #cbd5e1",
            borderRadius: "30px",
            color: isLiked ? "#ef4444" : "#475569",
            fontWeight: "bold",
            fontSize: "15px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <span>{isLiked ? "❤️" : "🤍"}</span>
          <span>좋아요 {likesCount}</span>
        </button>
      </div>

      {/* 댓글 섹션 */}
      <div style={{ marginTop: "60px", paddingTop: "30px", borderTop: "1px solid #eee" }}>
        <h3>댓글 ({comments.reduce(function(acc, c) { return acc + 1 + (c.replies?.length || 0); }, 0)})</h3>

        <form onSubmit={handleCommentSubmit} style={{ marginTop: "20px", marginBottom: "30px" }}>
          <textarea
            value={newComment}
            onChange={function(e) { setNewComment(e.target.value); }}
            placeholder={currentUserId ? "댓글을 남겨보세요..." : "로그인 후 댓글을 남길 수 있습니다."}
            disabled={!currentUserId || submitting}
            rows={3}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid var(--gh-border)",
              borderRadius: "6px",
              fontSize: "14px",
              resize: "vertical",
              background: "var(--gh-surface)",
              color: "var(--gh-text)",
            }}
            required
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
            <button
              type="submit"
              disabled={!currentUserId || submitting}
              style={{
                padding: "8px 18px",
                background: currentUserId && !submitting ? "var(--gh-control-active)" : "var(--gh-surface-muted)",
                color: currentUserId && !submitting ? "var(--gh-control-active-text)" : "var(--gh-text-subtle)",
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
            comments.map(function(comment) {
              const isCommentAuthor = currentUserId === comment.author_id;
              const isEditing = editingCommentId === comment.id;

              return (
                <div
                  key={comment.id}
                  id={"comment-" + comment.id}
                  style={{
                    padding: "16px",
                    background: "var(--gh-surface-muted)",
                    border: "1px solid var(--gh-border)",
                    borderRadius: "6px",
                    display: "flex",
                    gap: "12px",
                    flexDirection: "column"
                  }}
                >
                  <div style={{ display: "flex", gap: "12px" }}>
                    {comment.author_id ? (
                      <Link
                        href={"/profile/" + comment.author_id}
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
                          textDecoration: "none",
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
                      </Link>
                    ) : (
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
                    )}

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                          fontSize: "13px",
                          color: "var(--gh-text-muted)",
                        }}
                      >
                        {comment.author_id ? (
                          <Link
                            href={"/profile/" + comment.author_id}
                            style={{ fontWeight: "bold", color: "var(--gh-text)", textDecoration: "none" }}
                          >
                            {comment.author_name}
                          </Link>
                        ) : (
                          <span style={{ fontWeight: "bold", color: "var(--gh-text)" }}>{comment.author_name}</span>
                        )}
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <span>{new Date(comment.created_at).toLocaleString()}</span>
                          {isCommentAuthor && !isEditing && (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={handleStartEditComment.bind(null, comment)}
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
                                onClick={handleDeleteComment.bind(null, comment.id)}
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
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 댓글 본문 및 인라인 수정 모드 */}
                      {isEditing ? (
                        <div style={{ marginTop: "8px" }}>
                          <textarea
                            value={editingCommentContent}
                            onChange={function(e) { setEditingCommentContent(e.target.value); }}
                            rows={3}
                            style={{
                              width: "100%",
                              padding: "10px",
                                border: "1px solid var(--gh-border)",
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
                              onClick={handleSaveEditComment.bind(null, comment.id)}
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
                        <p style={{ margin: 0, fontSize: "15px", color: "var(--gh-text)", whiteSpace: "pre-wrap" }}>{comment.content}</p>
                      )}
                    </div>
                  </div>

                  {/* 답글 달기 버튼 및 답글 폼 */}
                  {currentUserId && (
                    <div style={{ marginTop: "4px", marginLeft: "44px" }}>
                      <button
                        onClick={function() {
                          setReplyingToId(replyingToId === comment.id ? null : comment.id);
                          setReplyContent("");
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#475569",
                          fontSize: "12px",
                          cursor: "pointer",
                          padding: 0,
                          fontWeight: "500",
                        }}
                      >
                        💬 {replyingToId === comment.id ? "답글 취소" : "답글 달기"}
                      </button>

                      {replyingToId === comment.id && (
                        <form onSubmit={function(e) { handleReplySubmit(e, comment.id); }} style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                          <input
                            type="text"
                            value={replyContent}
                            onChange={function(e) { setReplyContent(e.target.value); }}
                            placeholder="답글을 입력하세요..."
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              border: "1px solid var(--gh-border)",
                              borderRadius: "4px",
                              fontSize: "13px",
                              background: "var(--gh-surface)",
                              color: "var(--gh-text)",
                            }}
                            required
                          />
                          <button
                            type="submit"
                            disabled={submitting}
                            style={{
                              padding: "6px 14px",
                              background: "var(--gh-control-active)",
                              color: "var(--gh-control-active-text)",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "13px",
                              fontWeight: "500",
                            }}
                          >
                            {submitting ? "등록 중..." : "등록"}
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {/* 대댓글(답글) 목록 */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div style={{
                      marginTop: "12px",
                      marginLeft: "44px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      borderLeft: "2px solid var(--gh-border)",
                      paddingLeft: "16px"
                    }}>
                      {comment.replies.map(function(reply) {
                        const isReplyAuthor = currentUserId === reply.author_id;
                        const isEditingReply = editingCommentId === reply.id;

                        return (
                          <div key={reply.id} id={"comment-" + reply.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                            <div style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "50%",
                              background: "#e2e8f0",
                              overflow: "hidden",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}>
                              {reply.author_avatar ? (
                                <img src={reply.author_avatar} alt={reply.author_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <span style={{ fontSize: "11px" }}>👤</span>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", fontSize: "12px", color: "var(--gh-text-muted)", marginBottom: "4px", justifyContent: "space-between" }}>
                                <span style={{ fontWeight: "bold", color: "var(--gh-text)" }}>{reply.author_name}</span>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                  <span>{new Date(reply.created_at).toLocaleString()}</span>
                                  {isReplyAuthor && !isEditingReply && (
                                    <div style={{ display: "flex", gap: "8px" }}>
                                      <button
                                        onClick={handleStartEditComment.bind(null, reply)}
                                        style={{ background: "none", border: "none", color: "#2563eb", fontSize: "11px", cursor: "pointer", padding: 0 }}
                                      >
                                        수정
                                      </button>
                                      <button
                                        onClick={handleDeleteComment.bind(null, reply.id)}
                                        style={{ background: "none", border: "none", color: "#e53e3e", fontSize: "11px", cursor: "pointer", padding: 0 }}
                                      >
                                        삭제
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {isEditingReply ? (
                                <div style={{ marginTop: "4px" }}>
                                  <textarea
                                    value={editingCommentContent}
                                    onChange={function(e) { setEditingCommentContent(e.target.value); }}
                                    rows={2}
                                    style={{
                                      width: "100%",
                                      padding: "8px",
                                      border: "1px solid var(--gh-border)",
                                      borderRadius: "4px",
                                      fontSize: "13px",
                                      boxSizing: "border-box",
                                    }}
                                  />
                                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", marginTop: "4px" }}>
                                    <button
                                      onClick={handleCancelEditComment}
                                      style={{ padding: "2px 8px", background: "#cbd5e1", color: "#334155", border: "none", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                                    >
                                      취소
                                    </button>
                                    <button
                                      onClick={handleSaveEditComment.bind(null, reply.id)}
                                      style={{ padding: "2px 8px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                                    >
                                      저장
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p style={{ margin: 0, fontSize: "14px", color: "var(--gh-text)", whiteSpace: "pre-wrap" }}>{reply.content}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 하단 동일 카테고리 게시글 목록 */}
      <div className="related-posts" style={{ marginTop: "60px", paddingTop: "30px", borderTop: "2px solid var(--gh-text)" }}>
        <h3 style={{ marginBottom: "16px", fontSize: "18px", color: "#0f172a" }}>
          {"'" + currentCategoryLabel + "' 카테고리 다른 글"}
        </h3>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--gh-border)", background: "var(--gh-surface-muted)", textAlign: "left" }}>
              <th style={{ padding: "10px 12px", fontSize: "14px" }}>카테고리</th>
              <th style={{ padding: "10px 12px", fontSize: "14px" }}>제목</th>
              <th style={{ padding: "10px 12px", fontSize: "14px" }}>지역</th>
              <th style={{ padding: "10px 12px", fontSize: "14px" }}>작성자</th>
              <th style={{ padding: "10px 12px", fontSize: "14px" }}>작성일</th>
              <th style={{ padding: "10px 12px", fontSize: "14px", textAlign: "center" }}>조회</th>
            </tr>
          </thead>
          <tbody>
            {bottomPosts.map(function(p) {
              const isCurrent = String(p.id) === String(post.id);
              return (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: "1px solid var(--gh-border)",
                    background: isCurrent ? "var(--gh-surface-muted)" : "transparent",
                  }}
                >
                  <td className="related-post-category" style={{ padding: "10px 12px", fontSize: "13px", color: "var(--gh-text-muted)" }}>
                    {getCategoryLabel(p.category, "ko")}
                  </td>
                  <td className="related-post-title" style={{ padding: "10px 12px" }}>
                    <Link
                      href={"/posts/" + p.id + "?page=" + currentPage}
                      style={{
                        textDecoration: "none",
                        color: isCurrent ? "var(--gh-accent)" : "var(--gh-text)",
                        fontWeight: isCurrent ? "bold" : "normal",
                        fontSize: "14px",
                      }}
                    >
                      {p.title} {isCurrent && "◀ (현재글)"}
                    </Link>
                  </td>
                  <td className="related-post-region" style={{ padding: "10px 12px", fontSize: "13px", color: "var(--gh-text-muted)" }}>{p.region || "-"}</td>
                  <td className="related-post-author" style={{ padding: "10px 12px", fontSize: "13px", color: "var(--gh-text-muted)" }}>
                    {p.author_id ? (
                      <Link
                        href={"/profile/" + p.author_id}
                        style={{
                          textDecoration: "none",
                          color: "var(--gh-text-muted)",
                          fontWeight: 500,
                        }}
                      >
                        {p.author_name}
                      </Link>
                    ) : (
                      p.author_name
                    )}
                  </td>
                  <td className="related-post-date" style={{ padding: "10px 12px", fontSize: "13px", color: "var(--gh-text-subtle)" }}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="related-post-views" style={{ padding: "10px 12px", fontSize: "13px", color: "var(--gh-text-subtle)", textAlign: "center" }}>
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
            {Array.from({ length: totalPages }, function(_, i) { return i + 1; }).map(function(pageNum) {
              return (
                <button
                  key={pageNum}
                  onClick={setCurrentPage.bind(null, pageNum)}
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
              );
            })}
          </div>
        )}
      </div>

      {/* 포스트 글 삭제 관련 버튼 핸들러 연결용 빈 폼 또는 트리거 */}
      {isAuthor && (
        <div style={{ display: "none" }}>
          <button id="btn-delete-post" onClick={handleDeletePost} />
        </div>
      )}
    </div>
  );
}
