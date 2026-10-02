"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Post, Comment } from "@/types/post";
import { getCategoryLabel, getPostRegionPolicy, shouldDisplayPostRegion } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/date";
import { linkifyPlainText } from "@/lib/linkify";
import {
  COMMENT_RULE,
  formatCharacterCount,
  getContentValidationDatabaseMessage,
  validateText,
} from "@/lib/contentValidation";
import { VIEW_INCREMENT_EVENT } from "@/components/PostViewCount";
import AuthorActionMenu from "@/components/AuthorActionMenu";
import CommunityIdentity from "@/components/CommunityIdentity";
import PostEngagementStats, { HeartIcon } from "@/components/PostEngagementStats";
import { fetchPublicCommunityIdentities, type PublicCommunityIdentityMap } from "@/lib/publicCommunityIdentity";
import { deletePostImagesByUrl, getStoredImageUrls } from "@/lib/postImages";

const PAGE_SIZE = 10;
const VIEW_COUNT_DEDUPLICATION_MS = 30 * 60 * 1000;

function getPaginationItems(currentPage: number, totalPages: number): Array<number | string> {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);

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

type RelatedPost = Post & {
  post_likes?: EngagementCount[] | null;
};

interface PostDetailClientProps {
  id: string;
  initialPost: Post;
  initialComments: Comment[];
  initialCommentsError: boolean;
  initialUserId: string | null;
}

export default function PostDetailClient({
  id,
  initialPost,
  initialComments,
  initialCommentsError,
  initialUserId,
}: PostDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPage = parseInt(searchParams.get("page") || "1", 10);

  const [post] = useState<Post>(initialPost);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [communityIdentities, setCommunityIdentities] = useState<PublicCommunityIdentityMap>({});
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(
    initialCommentsError ? "댓글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요." : null
  );
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

  const [bottomPosts, setBottomPosts] = useState<RelatedPost[]>([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [relatedPostsLoading, setRelatedPostsLoading] = useState(true);
  const [relatedPostsError, setRelatedPostsError] = useState<string | null>(null);
  const newCommentCharacterCount = formatCharacterCount(newComment, COMMENT_RULE.maxLength);
  const replyCharacterCount = formatCharacterCount(replyContent, COMMENT_RULE.maxLength);
  const editingCommentCharacterCount = formatCharacterCount(editingCommentContent, COMMENT_RULE.maxLength);

  useEffect(function() {
    let isCurrent = true;
    const authorIds = [post.author_id, ...bottomPosts.map(function(item) { return item.author_id; })];
    comments.forEach(function(comment) {
      authorIds.push(comment.author_id);
      (comment.replies || []).forEach(function(reply) { authorIds.push(reply.author_id); });
    });

    fetchPublicCommunityIdentities(authorIds).then(function(identityMap) {
      if (isCurrent) setCommunityIdentities(identityMap);
    });
    return function() { isCurrent = false; };
  }, [comments, post.author_id, bottomPosts]);

  async function fetchComments() {
    setCommentsLoading(true);
    setCommentsError(null);

    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", parseInt(id, 10))
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Comments fetch error:", error);
        setComments([]);
        setCommentsError("댓글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      const commentsData = data || [];
      const authorIds = Array.from(new Set(commentsData.map(function(c) { return c.author_id; }).filter(Boolean)));
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

      commentsData.forEach(function(c) {
        const commentWithAvatar: Comment = {
          ...c,
          author_avatar: avatarMap[c.author_id] || null,
          replies: []
        };

        if (!c.parent_id) {
          rootComments.push(commentWithAvatar);
        } else {
          let targetParentId = c.parent_id;
          const parentComment = commentsData.find(function(pc) { return pc.id === targetParentId; });
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
      setCommentsError(null);
    } catch (err) {
      console.error("Unexpected comments fetch error:", err);
      setComments([]);
      setCommentsError("댓글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setCommentsLoading(false);
    }
  }

  useEffect(function() {
    let isCurrent = true;

    async function loadSessionAndLikes() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isCurrent) return;

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

        if (!isCurrent) return;

        if (userLike) {
          initialIsLiked = true;
        }
      }

      if (!isCurrent) return;

      setLikesCount(initialLikesCount);
      setIsLiked(initialIsLiked);
    }

    async function loadBottomPosts() {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      setRelatedPostsLoading(true);
      setRelatedPostsError(null);

      try {
        const { count, error: countError } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("category", post.category);

        if (countError) {
          console.error("Related posts count fetch error:", countError);
          if (isCurrent) {
            setBottomPosts([]);
            setRelatedPostsError("관련 게시글을 불러오지 못했습니다.");
          }
          return;
        }

        if (!isCurrent) return;

        if (count !== null) {
          setTotalPages(Math.ceil(count / PAGE_SIZE) || 1);
        }

        const { data, error } = await supabase
          .from("posts")
          .select("*, post_likes(count)")
          .eq("category", post.category)
          .order("created_at", { ascending: false })
          .range(from, to)
          .returns<RelatedPost[]>();

        if (error) {
          console.error("Related posts fetch error:", error);
          if (isCurrent) {
            setBottomPosts([]);
            setRelatedPostsError("관련 게시글을 불러오지 못했습니다.");
          }
          return;
        }

        const relatedPosts = data || [];
        const authorIds = Array.from(new Set(relatedPosts.map(function(p) { return p.author_id; }).filter(Boolean))) as string[];
        const avatarMap: Record<string, string> = {};

        if (authorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, avatar_url")
            .in("id", authorIds);

          if (profiles) {
            profiles.forEach(function(profile) {
              if (profile.avatar_url) avatarMap[profile.id] = profile.avatar_url;
            });
          }
        }

        const relatedPostsWithAvatar = relatedPosts.map(function(p) {
          return {
            ...p,
            author_avatar: p.author_id ? avatarMap[p.author_id] || "" : "",
          };
        });

        if (isCurrent) {
          setBottomPosts(relatedPostsWithAvatar);
          setRelatedPostsError(null);
        }
      } catch (err) {
        console.error("Unexpected related posts fetch error:", err);
        if (isCurrent) {
          setBottomPosts([]);
          setRelatedPostsError("관련 게시글을 불러오지 못했습니다.");
        }
      } finally {
        if (isCurrent) setRelatedPostsLoading(false);
      }
    }

    loadSessionAndLikes();
    loadBottomPosts();

    return function() {
      isCurrent = false;
    };
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

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      alert("로그인 세션이 만료되었습니다.");
      return;
    }

    const { error } = await supabase.from("posts").delete().eq("id", parseInt(id, 10));
    if (error) {
      alert("삭제 실패: " + error.message);
      return;
    }

    await deletePostImagesByUrl(
      getStoredImageUrls(initialPost.content),
      session.access_token,
    ).catch((cleanupError) => {
      console.error("Deleted post image cleanup error:", cleanupError);
    });

    alert("삭제되었습니다.");
    router.push("/");
    router.refresh();
  }

  async function handleCommentSubmit(e: FormEvent) {
    e.preventDefault();
    const commentValidation = validateText(newComment, COMMENT_RULE);
    if (commentValidation.errorMessage) {
      alert(commentValidation.errorMessage);
      return;
    }

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
      content: commentValidation.value,
    });

    setSubmitting(false);

    if (error) {
      console.error("Comment creation error:", error);
      alert(
        getContentValidationDatabaseMessage(error, "comment") ?? "댓글 작성 실패: " + error.message,
      );
      return;
    }

    setNewComment("");
    fetchComments();
  }

  async function handleReplySubmit(e: FormEvent, parentId: string) {
    e.preventDefault();
    const replyValidation = validateText(replyContent, COMMENT_RULE);
    if (replyValidation.errorMessage) {
      alert(replyValidation.errorMessage);
      return;
    }

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
      content: replyValidation.value,
    });

    setSubmitting(false);

    if (error) {
      console.error("Reply creation error:", error);
      alert(
        getContentValidationDatabaseMessage(error, "comment") ?? "답글 작성 실패: " + error.message,
      );
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
    const commentValidation = validateText(editingCommentContent, COMMENT_RULE);
    if (commentValidation.errorMessage) {
      alert(commentValidation.errorMessage);
      return;
    }

    setUpdatingComment(true);

    const { error } = await supabase
      .from("comments")
      .update({ content: commentValidation.value })
      .eq("id", commentId);

    setUpdatingComment(false);

    if (error) {
      console.error("Comment update error:", error);
      alert(
        getContentValidationDatabaseMessage(error, "comment") ?? "댓글 수정 실패: " + error.message,
      );
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
  const relatedUsesRegion = getPostRegionPolicy(post.category).usesRegion;

  return (
    <div>
      <div className="post-action-bar">
        <button
          className={"post-action-button gh-like-action" + (isLiked ? " is-active" : "")}
          onClick={handleLikeToggle}
        >
          <HeartIcon className="gh-like-icon" />
          <span>좋아요 {likesCount}</span>
        </button>

        {isAuthor && (
          <div className="post-owner-actions">
            <Link href={"/posts/" + id + "/edit"} className="post-action-button">
              수정
            </Link>
            <button type="button" onClick={handleDeletePost} className="post-action-button">
              삭제
            </button>
          </div>
        )}
      </div>

      {/* 댓글 섹션 */}
      <div className="post-comments-section">
        <h3>댓글 ({comments.reduce(function(acc, c) { return acc + 1 + (c.replies?.length || 0); }, 0)})</h3>

        <form onSubmit={handleCommentSubmit} style={{ marginTop: "20px", marginBottom: "30px" }} noValidate>
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
              fontSize: "16px",
              resize: "vertical",
              background: "var(--gh-surface)",
              color: "var(--gh-text)",
            }}
            required
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
            <span style={{ color: "var(--gh-text-subtle)", fontSize: "12px" }}>
              {newCommentCharacterCount}
            </span>
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
          {commentsLoading ? (
            <p style={{ color: "var(--gh-text-muted)", fontSize: "14px" }}>댓글을 불러오는 중입니다...</p>
          ) : commentsError ? (
            <div style={{ color: "var(--gh-text-muted)", fontSize: "14px" }}>
              <p style={{ margin: "0 0 10px" }}>{commentsError}</p>
              <button
                type="button"
                onClick={fetchComments}
                style={{
                  padding: "6px 12px",
                  background: "var(--gh-surface-muted)",
                  color: "var(--gh-text)",
                  border: "1px solid var(--gh-border)",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                다시 시도
              </button>
            </div>
          ) : comments.length === 0 ? (
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
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
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
                          {comment.author_id && communityIdentities[comment.author_id] && (
                            <CommunityIdentity xp={communityIdentities[comment.author_id].reputation_xp} tenureValue={communityIdentities[comment.author_id].tenure_value} tenureUnit={communityIdentities[comment.author_id].tenure_unit} showLevel={communityIdentities[comment.author_id].show_community_level} showTenure={communityIdentities[comment.author_id].show_germany_tenure} compact />
                          )}
                        </div>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <span>{formatDateTime(comment.created_at)}</span>
                          {isCommentAuthor && !isEditing && (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={handleStartEditComment.bind(null, comment)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--gh-accent)",
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
                                  color: "var(--gh-alert, #a86f68)",
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
                              fontSize: "16px",
                              resize: "vertical",
                              boxSizing: "border-box",
                            }}
                          />
                          <p style={{ margin: "6px 0 0", color: "var(--gh-text-subtle)", fontSize: "12px", textAlign: "right" }}>
                            {editingCommentCharacterCount}
                          </p>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
                            <button
                              onClick={handleCancelEditComment}
                              disabled={updatingComment}
                              style={{
                                padding: "4px 10px",
                                background: "var(--gh-surface-muted)",
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
                                background: "var(--gh-accent)",
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
                        <p style={{ margin: 0, fontSize: "15px", color: "var(--gh-text)", whiteSpace: "pre-wrap" }}>
                          {linkifyPlainText(comment.content)}
                        </p>
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
                        <form onSubmit={function(e) { handleReplySubmit(e, comment.id); }} style={{ marginTop: "8px" }} noValidate>
                          <div style={{ display: "flex", gap: "8px" }}>
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
                                fontSize: "16px",
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
                          </div>
                          <p style={{ margin: "4px 0 0", color: "var(--gh-text-subtle)", fontSize: "12px", textAlign: "right" }}>
                            {replyCharacterCount}
                          </p>
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
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
                                  <span style={{ fontWeight: "bold", color: "var(--gh-text)" }}>{reply.author_name}</span>
                                  {reply.author_id && communityIdentities[reply.author_id] && (
                                    <CommunityIdentity xp={communityIdentities[reply.author_id].reputation_xp} tenureValue={communityIdentities[reply.author_id].tenure_value} tenureUnit={communityIdentities[reply.author_id].tenure_unit} showLevel={communityIdentities[reply.author_id].show_community_level} showTenure={communityIdentities[reply.author_id].show_germany_tenure} compact />
                                  )}
                                </div>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                  <span>{formatDateTime(reply.created_at)}</span>
                                  {isReplyAuthor && !isEditingReply && (
                                    <div style={{ display: "flex", gap: "8px" }}>
                                      <button
                                        onClick={handleStartEditComment.bind(null, reply)}
                                        style={{ background: "none", border: "none", color: "var(--gh-accent)", fontSize: "11px", cursor: "pointer", padding: 0 }}
                                      >
                                        수정
                                      </button>
                                      <button
                                        onClick={handleDeleteComment.bind(null, reply.id)}
                                        style={{ background: "none", border: "none", color: "var(--gh-alert, #a86f68)", fontSize: "11px", cursor: "pointer", padding: 0 }}
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
                                      fontSize: "16px",
                                      boxSizing: "border-box",
                                    }}
                                  />
                                  <p style={{ margin: "4px 0 0", color: "var(--gh-text-subtle)", fontSize: "12px", textAlign: "right" }}>
                                    {editingCommentCharacterCount}
                                  </p>
                                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", marginTop: "4px" }}>
                                    <button
                                      onClick={handleCancelEditComment}
                                      style={{ padding: "2px 8px", background: "var(--gh-surface-muted)", color: "var(--gh-text)", border: "none", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                                    >
                                      취소
                                    </button>
                                    <button
                                      onClick={handleSaveEditComment.bind(null, reply.id)}
                                      style={{ padding: "2px 8px", background: "var(--gh-accent)", color: "#fff", border: "none", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                                    >
                                      저장
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p style={{ margin: 0, fontSize: "14px", color: "var(--gh-text)", whiteSpace: "pre-wrap" }}>
                                  {linkifyPlainText(reply.content)}
                                </p>
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
      <div className="related-posts">
        <h3 style={{ marginBottom: "16px", fontSize: "18px", color: "#0f172a" }}>
          {"'" + currentCategoryLabel + "' 카테고리 다른 글"}
        </h3>

        {relatedPostsLoading ? (
          <p style={{ color: "var(--gh-text-muted)", fontSize: "14px" }}>관련 게시글을 불러오는 중입니다...</p>
        ) : relatedPostsError ? (
          <p style={{ color: "var(--gh-text-muted)", fontSize: "14px" }}>{relatedPostsError}</p>
        ) : bottomPosts.length === 0 ? (
          <p style={{ color: "var(--gh-text-muted)", fontSize: "14px" }}>관련 게시글이 없습니다.</p>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--gh-border)", background: "var(--gh-surface-muted)", color: "var(--gh-text)", textAlign: "left" }}>
                  <th style={{ padding: "14px" }}>카테고리</th>
                  <th style={{ padding: "14px" }}>제목</th>
                  {relatedUsesRegion && <th style={{ padding: "14px" }}>지역</th>}
                  <th style={{ padding: "14px" }}>작성자</th>
                  <th style={{ padding: "14px" }}>작성일</th>
                  <th style={{ padding: "14px", textAlign: "center" }}>반응</th>
                </tr>
              </thead>
              <tbody>
                {bottomPosts.map(function(p) {
                  const isCurrent = String(p.id) === String(post.id);
                  const relatedLikesCount = p.post_likes?.[0]?.count || 0;
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: "1px solid var(--gh-border)",
                        background: isCurrent ? "var(--gh-surface-muted)" : "transparent",
                      }}
                    >
                      <td className="related-post-category" style={{ padding: "18px 14px", fontSize: "14px", color: "var(--gh-text-muted)" }}>
                        {getCategoryLabel(p.category, "ko")}
                      </td>
                      <td className="related-post-title" style={{ padding: "18px 14px" }}>
                        <Link
                          href={"/posts/" + p.id + "?page=" + currentPage}
                          style={{
                            textDecoration: "none",
                            color: isCurrent ? "var(--gh-accent)" : "var(--gh-text)",
                            fontWeight: isCurrent ? "bold" : "600",
                          }}
                        >
                          {p.title} {isCurrent && "◀ (현재글)"}
                        </Link>
                      </td>
                      {relatedUsesRegion && (
                        <td className="related-post-region" style={{ padding: "18px 14px", fontSize: "14px", color: "var(--gh-text-muted)" }}>
                          {shouldDisplayPostRegion(p.category, p.region) ? p.region : ""}
                        </td>
                      )}
                      <td className="related-post-author" style={{ padding: "18px 14px", fontSize: "14px", color: "var(--gh-text-muted)" }}>
                        {p.author_id ? (
                          <span className="related-post-author-line">
                          <AuthorActionMenu
                            authorId={p.author_id}
                            authorName={p.author_name}
                            avatarUrl={p.author_avatar}
                          />
                          {communityIdentities[p.author_id] && (
                            <CommunityIdentity
                              xp={communityIdentities[p.author_id].reputation_xp}
                              tenureValue={communityIdentities[p.author_id].tenure_value}
                              tenureUnit={communityIdentities[p.author_id].tenure_unit}
                              showLevel={communityIdentities[p.author_id].show_community_level}
                              showTenure={communityIdentities[p.author_id].show_germany_tenure}
                              compact
                            />
                          )}
                          </span>
                        ) : (
                          <span>{p.author_name}</span>
                        )}
                      </td>
                      <td className="related-post-date" style={{ padding: "18px 14px", fontSize: "14px", color: "var(--gh-text-subtle)" }}>
                        {formatDate(p.created_at)}
                      </td>
                      <td className="related-post-views" style={{ padding: "18px 14px", fontSize: "14px", color: "var(--gh-text-muted)", textAlign: "center" }}>
                        <span className="related-post-date-inline">{formatDate(p.created_at)}</span><PostEngagementStats views={p.views || 0} likes={relatedLikesCount} className="related-post-stats" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <nav
                aria-label="관련 게시글 페이지"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginTop: "20px",
                }}
              >
                <button
                  type="button"
                  onClick={function() { setCurrentPage(Math.max(1, currentPage - 1)); }}
                  disabled={currentPage === 1}
                  aria-label="이전 페이지"
                  style={{ minWidth: "44px", height: "44px", border: "1px solid #cbd5e1", borderRadius: "4px", background: "#fff", color: "#334155", cursor: currentPage === 1 ? "default" : "pointer", opacity: currentPage === 1 ? 0.45 : 1 }}
                >
                  ‹
                </button>
                {getPaginationItems(currentPage, totalPages).map(function(item) {
                  if (typeof item === "string") return <span key={item} aria-hidden="true" style={{ padding: "0 2px" }}>…</span>;
                  return (
                    <button
                      type="button"
                      key={item}
                      onClick={setCurrentPage.bind(null, item)}
                      aria-current={currentPage === item ? "page" : undefined}
                      aria-label={`${item}페이지`}
                      style={{
                        minWidth: "44px",
                        height: "44px",
                        padding: "0 10px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                        background: currentPage === item ? "#0f172a" : "#fff",
                        color: currentPage === item ? "#fff" : "#334155",
                        fontWeight: currentPage === item ? "bold" : "normal",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      {item}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={function() { setCurrentPage(Math.min(totalPages, currentPage + 1)); }}
                  disabled={currentPage === totalPages}
                  aria-label="다음 페이지"
                  style={{ minWidth: "44px", height: "44px", border: "1px solid #cbd5e1", borderRadius: "4px", background: "#fff", color: "#334155", cursor: currentPage === totalPages ? "default" : "pointer", opacity: currentPage === totalPages ? 0.45 : 1 }}
                >
                  ›
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
