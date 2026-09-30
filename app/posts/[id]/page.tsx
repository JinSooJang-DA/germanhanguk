import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PostDetailClient from "@/components/PostDetailClient";
import { getCategoryLabel } from "@/lib/constants";
import { formatDate } from "@/lib/date";
import { Post, Comment } from "@/types/post";
import PostViewCount from "@/components/PostViewCount";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: post } = await supabase
    .from("posts")
    .select("title, content")
    .eq("id", parseInt(id, 10))
    .single();

  if (!post) {
    return { title: "게시글을 찾을 수 없습니다 - GermanHanguk" };
  }

  const snippet = post.content ? post.content.substring(0, 150) + "..." : "";
  return {
    title: post.title + " - GermanHanguk",
    description: snippet,
    openGraph: {
      title: post.title + " - GermanHanguk",
      description: snippet,
      type: "article",
    },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. Fetch post on Server (statically pre-rendered for search indexability)
  const { data: postData } = await supabase
    .from("posts")
    .select("*")
    .eq("id", parseInt(id, 10))
    .single();

  if (!postData) {
    return (
      <main className="post-detail">
        <div className="wrapper">
          <p>게시글을 찾을 수 없습니다.</p>
          <Link href="/" className="back-link">← 목록으로 돌아가기</Link>
        </div>
      </main>
    );
  }

  // 2. Fetch comments on Server (pre-rendered for search indexability)
  const { data: commentsData } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", parseInt(id, 10))
    .order("created_at", { ascending: true });

  const commentsRaw = (commentsData || []) as Comment[];

  // 서버사이드에서 댓글 작성자 아바타 매핑 가져오기 (첫 로드 시 아바타 미출력 버그 방지)
  const authorIds = Array.from(new Set(commentsRaw.map(function(c) { return c.author_id; }).filter(Boolean)));
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

  commentsRaw.forEach(function(c) {
    const commentWithAvatar: Comment = {
      ...c,
      author_avatar: avatarMap[c.author_id] || null,
      replies: []
    };

    if (!c.parent_id) {
      rootComments.push(commentWithAvatar);
    } else {
      let targetParentId = c.parent_id;
      const parentComment = commentsRaw.find(function(pc) { return pc.id === targetParentId; });
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

  const comments = rootComments;

  let authorAvatar = "";
  if (postData.author_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", postData.author_id)
      .single();
    if (profile?.avatar_url) {
      authorAvatar = profile.avatar_url;
    }
  }

  const post: Post = {
    ...postData,
    author_avatar: authorAvatar,
  };

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;

  const currentCategoryLabel = getCategoryLabel(post.category, "ko");

  return (
    <main className="post-detail">
      <div className="wrapper">
        <Link href="/" className="back-link">← 목록으로 돌아가기</Link>

        <div className="post-meta">
          <span>[{currentCategoryLabel}]</span>
          {post.region && <span>{post.region}</span>}
          <span>{formatDate(post.created_at)}</span>
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
            borderBottom: "1px solid #eee",
            paddingBottom: "20px"
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ fontWeight: "bold", color: "var(--gh-text)" }}>{post.author_name}</span>
            <span style={{ marginLeft: "8px", color: "#94a3b8" }}>
              <PostViewCount postId={post.id} initialViews={post.views || 0} />
            </span>
          </div>
        </div>

        {/* Static Post Content - 100% indexable by search engine crawlers */}
        <div className="post-content" style={{ whiteSpace: "pre-wrap", fontSize: "16px", lineHeight: "1.8" }}>
          {post.content}
        </div>

        {/* Client-side interactive layer (Optimistic likes, Replies list, submission forms, list navigation) */}
        <PostDetailClient id={id} initialPost={post} initialComments={comments} initialUserId={userId} />
      </div>
    </main>
  );
}
