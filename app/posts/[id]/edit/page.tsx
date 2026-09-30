"use client";

import { FormEvent, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  CATEGORIES,
  EDUCATION_SUB_CATEGORY_OPTIONS,
  EDUCATION_TARGET_FIELD_OPTIONS,
  getPostAuthoringCopy,
  getPostRegionPolicy,
  getPostRegionValue,
} from "@/lib/constants";
import {
  formatCharacterCount,
  getContentValidationDatabaseMessage,
  POST_CONTENT_RULE,
  POST_TITLE_RULE,
  validateText,
} from "@/lib/contentValidation";

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
  const [subCategory, setSubCategory] = useState("visa");
  const [targetField, setTargetField] = useState("engineering");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const regionPolicy = getPostRegionPolicy(category);
  const authoringCopy = getPostAuthoringCopy(category);
  const titleCharacterCount = formatCharacterCount(title, POST_TITLE_RULE.maxLength);
  const contentCharacterCount = formatCharacterCount(content, POST_CONTENT_RULE.maxLength);

  const handleCategoryChange = (nextCategory: string) => {
    setCategory(nextCategory);
    setRegion("");
  };

  useEffect(() => {
    async function loadPost() {
      try {
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
        setSubCategory(post.sub_category || "visa");
        setTargetField(post.target_field || "engineering");
        setLoading(false);
      } catch (err) {
        console.error("Post edit load error:", err);
        setLoadError("게시글 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        setLoading(false);
      }
    }

    loadPost();
  }, [id, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const titleValidation = validateText(title, POST_TITLE_RULE);
    if (titleValidation.errorMessage) {
      alert(titleValidation.errorMessage);
      return;
    }

    const contentValidation = validateText(content, POST_CONTENT_RULE);
    if (contentValidation.errorMessage) {
      alert(contentValidation.errorMessage);
      return;
    }

    const postRegion = getPostRegionValue(category, region);

    if (regionPolicy.required && !postRegion) {
      alert(`${regionPolicy.label}을 입력해 주세요.`);
      return;
    }

    setSaving(true);

    const updatePayload = {
      title: titleValidation.value,
      content: contentValidation.value,
      category,
      region: postRegion,
    };

    if (category === "education") {
      Object.assign(updatePayload, {
        sub_category: subCategory,
        target_field: targetField,
      });
    }

    const { error } = await supabase
      .from("posts")
      .update(updatePayload)
      .eq("id", id);

    setSaving(false);

    if (error) {
      console.error("Post update error:", error);
      alert(
        getContentValidationDatabaseMessage(error, "post") ?? "수정 실패: " + error.message,
      );
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

  if (loadError) {
    return (
      <main className="new-post-page">
        <div className="post-form-container" style={{ textAlign: "center", padding: "40px" }}>
          <p>{loadError}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="new-post-page">
      <div className="post-form-container">
        <h1>게시글 수정</h1>

        <form className="post-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="category">카테고리</label>
            <select
              id="category"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label.ko}
                </option>
              ))}
            </select>
          </div>

          {category === "education" && (
            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", marginBottom: "16px", display: "grid", gap: "12px", border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0, fontWeight: "500" }}>
                💡 유학·교육 관련 상세 정보를 선택해 주세요. 교민 전체가 정확한 조언을 줄 수 있습니다.
              </p>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="subCategory">주요 주제</label>
                <select
                  id="subCategory"
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                >
                  {EDUCATION_SUB_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="targetField">전공 계열</label>
                <select
                  id="targetField"
                  value={targetField}
                  onChange={(e) => setTargetField(e.target.value)}
                >
                  {EDUCATION_TARGET_FIELD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {regionPolicy.usesRegion && (
            <div className="form-group">
              <label htmlFor="region">{regionPolicy.label}</label>
              <input
                id="region"
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="예: Berlin, München, Münster"
                required={regionPolicy.required}
              />
            </div>
          )}

          {authoringCopy.helperText && (
            <p className="post-authoring-helper">{authoringCopy.helperText}</p>
          )}

          <div className="form-group">
            <label htmlFor="title">제목</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={authoringCopy.titlePlaceholder}
              aria-describedby="title-character-count"
              required
            />
            <p id="title-character-count" style={{ margin: "6px 0 0", color: "var(--gh-text-subtle)", fontSize: "12px", textAlign: "right" }}>
              {titleCharacterCount}
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="content">내용</label>
            <textarea
              id="content"
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={authoringCopy.contentPlaceholder}
              aria-describedby="content-character-count"
              required
            />
            <p id="content-character-count" style={{ margin: "6px 0 0", color: "var(--gh-text-subtle)", fontSize: "12px", textAlign: "right" }}>
              {contentCharacterCount}
            </p>
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
