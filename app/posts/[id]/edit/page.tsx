"use client";

import { FormEvent, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  { label: "커뮤니티", value: "community" },
  { label: "생활정보", value: "life" },
  { label: "중고장터", value: "market" },
  { label: "구인구직", value: "jobs" },
  { label: "행사", value: "events" },
];

export default function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("community");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadPost() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인이 필요합니다.");
        router.push("/auth");
        return;
      }

      // 게시글 가져오기
      const { data: post, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !post) {
        alert("게시글을 찾을 수 없습니다.");
        router.push("/");
        return;
      }

      // 작성자 확인
      if (post.author_id !== user.id) {
        alert("본인의 글만 수정할 수 있습니다.");
        router.push(`/posts/${id}`);
        return;
      }

      setTitle(post.title);
      setContent(post.content);
      setCategory(post.category);
      setRegion(post.region || "");
      setLoading(false);
    }

    loadPost();
  }, [id, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("posts")
      .update({
        title,
        content,
        category,
        region,
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      alert("수정 실패: " + error.message);
      return;
    }

    alert("게시글이 수정되었습니다.");
    router.push(`/posts/${id}`);
    router.refresh();
  }

  if (loading) {
    return (
      <main className="new-post-page">
        <div className="post-form-container" style={{ textAlign: "center", padding: "40px" }}>
          <p>게시글 정보를 불러오는 중입니다...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="new-post-page">
      <div className="post-form-container">
        <h1>게시글 수정</h1>

        <form className="post-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="category">카테고리</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="region">지역 (선택 입력)</label>
            <input
              id="region"
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="예: Frankfurt, Berlin, München"
            />
          </div>

          <div className="form-group">
            <label htmlFor="title">제목</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">내용</label>
            <textarea
              id="content"
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 작성하세요"
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? "수정 중..." : "수정 완료"}
          </button>
        </form>

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <Link href={`/posts/${id}`} style={{ color: "#666", fontSize: "14px" }}>
            ← 취소하고 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}