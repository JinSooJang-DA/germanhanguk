import Link from "next/link";
import { getCommunityListHref } from "@/lib/communityNavigation";
import { supabase } from "@/lib/supabase";
import PostDetailClient from "@/components/PostDetailClient";
import { getCategoryLabel, getEducationSubCategoryLabel, shouldDisplayPostRegion } from "@/lib/constants";
import { formatDate } from "@/lib/date";
import { Post, Comment } from "@/types/post";
import PostViewCount from "@/components/PostViewCount";
import AuthorActionMenu from "@/components/AuthorActionMenu";
import CommunityIdentity from "@/components/CommunityIdentity";
import { fetchPublicCommunityIdentities } from "@/lib/publicCommunityIdentity";
import PostContent from "@/components/PostContent";
import { stripPostImageTokens } from "@/lib/postImages";

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

  const plainContent = stripPostImageTokens(post.content || "");
  const snippet = plainContent ? plainContent.substring(0, 150) + (plainContent.length > 150 ? "..." : "") : "";
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

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>
}) {
  const { id } = await params;
  const { returnTo } = await searchParams;
  const originList = typeof returnTo === "string" ? returnTo : undefined;

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
          <Link href={getCommunityListHref(originList)} className="back-link">← 목록으로 돌아가기</Link>
        </div>
      </main>
    );
  }

  // 2. Fetch comments on Server (pre-rendered for search indexability)
  const { data: commentsData, error: commentsError } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", parseInt(id, 10))
    .order("created_at", { ascending: true });

  if (commentsError) {
    console.error("Post comments load error:", commentsError);
  }

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
  const identityMap = await fetchPublicCommunityIdentities([post.author_id]);
  const authorIdentity = post.author_id ? identityMap[post.author_id] : null;

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;

  const currentCategoryLabel = post.category === "education"
    ? getEducationSubCategoryLabel(post.sub_category)
    : getCategoryLabel(post.category, "ko");
  const communityListHref = getCommunityListHref(originList, post.category);

  return (
    <main className="post-detail">
      <div className="wrapper">
        <Link href={communityListHref} className="back-link">← 목록으로 돌아가기</Link>

        <div className="post-meta">
          <span>[{currentCategoryLabel}]</span>
          {shouldDisplayPostRegion(post.category, post.region) && (
            <span>{post.region}</span>
          )}
          <span>{formatDate(post.created_at)}</span>
        </div>

        <h1>{post.title}</h1>

        <div className="post-author">
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px" }}>
              {post.author_id ? (
                <AuthorActionMenu authorId={post.author_id} authorName={post.author_name} avatarUrl={post.author_avatar} />
              ) : (
                <span style={{ fontWeight: "bold", color: "var(--gh-text)" }}>{post.author_name}</span>
              )}
              {authorIdentity && (
                <CommunityIdentity xp={authorIdentity.reputation_xp} tenureValue={authorIdentity.tenure_value} tenureUnit={authorIdentity.tenure_unit} showLevel={authorIdentity.show_community_level} showTenure={authorIdentity.show_germany_tenure} compact />
              )}
            </div>
            <span style={{ marginLeft: "8px", color: "#94a3b8" }}>
              <PostViewCount postId={post.id} initialViews={post.views || 0} />
            </span>
          </div>
        </div>

        {/* Static Post Content - 100% indexable by search engine crawlers */}
        <PostContent content={post.content} />

        {/* Client-side interactive layer (Optimistic likes, Replies list, submission forms, list navigation) */}
        <PostDetailClient
          communityListHref={communityListHref}
          id={id}
          initialPost={post}
          initialComments={comments}
          initialCommentsError={Boolean(commentsError)}
          initialUserId={userId}
        />
      </div>
    </main>
  );
}
