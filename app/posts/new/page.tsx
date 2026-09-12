"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NewPostPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("community");
  const [region, setRegion] = useState("");
  
  // 유학·교육 카테고리 전용 상세 상태값
  const [eduCity, setEduCity] = useState("Berlin");
  const [subCategory, setSubCategory] = useState("visa");
  const [targetField, setTargetField] = useState("engineering");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // 페이지 진입 시 로그인 여부 체크
  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("로그인이 필요한 서비스입니다.");
        router.push("/auth");
      } else {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  // 게시글 등록 제출 핸들러
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("로그인 세션이 만료되었습니다.");
      router.push("/auth");
      return;
    }

    // profiles 테이블에서 내 닉네임(display_name) 가져오기
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const authorName = profile?.display_name || user.email?.split("@")[0] || "회원";

    // 데이터 저장 객체 구성 ('education'인 경우에만 상세 필드값 저장)
    const postData: any = {
      title,
      content,
      category,
      region: category === "education" ? eduCity : region,
      author_id: user.id,
      author_name: authorName,
    };

    if (category === "education") {
      postData.sub_category = subCategory;
      postData.target_field = targetField;
    }

    const { error } = await supabase.from("posts").insert(postData);

    if (error) {
      setMessage("글 작성 실패: " + error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  // 로그인 체크 중일 때 깜빡임 방지
  if (loading) {
    return (
      <main className="new-post-page">
        <div className="post-form-container" style={{ textAlign: "center", padding: "40px" }}>
          <p>인증 상태를 확인하는 중입니다...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="new-post-page">
      <div className="post-form-container">
        <h1>글쓰기</h1>

        <form className="post-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="category">카테고리</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="community">커뮤니티</option>
              <option value="education">유학·교육</option>
              <option value="life">생활정보</option>
              <option value="market">중고장터</option>
              <option value="jobs">구인구직</option>
              <option value="events">행사</option>
            </select>
          </div>

          {/* '유학·교육' 카테고리를 선택했을 때 나타나는 동적 상세 입력 영역 */}
          {category === "education" ? (
            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", marginBottom: "16px", display: "grid", gap: "12px", border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0, fontWeight: "500" }}>
                💡 유학·교육 관련 상세 정보를 선택해 주세요. 교민 전체가 정확한 조언을 줄 수 있습니다.
              </p>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="eduCity">관련 지역</label>
                <select
                  id="eduCity"
                  value={eduCity}
                  onChange={(e) => setEduCity(e.target.value)}
                >
                  <option value="Berlin">베를린 (Berlin)</option>
                  <option value="Munich">뮌헨 (München)</option>
                  <option value="Frankfurt">프랑크푸르트 (Frankfurt)</option>
                  <option value="Muenster">뮌스터 (Münster)</option>
                  <option value="Etc">기타 지역</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="subCategory">주요 주제</label>
                <select
                  id="subCategory"
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                >
                  <option value="visa">비자 / 외국인청</option>
                  <option value="housing">집구하기 / WG</option>
                  <option value="insurance">보험 / 폐쇄계좌</option>
                  <option value="admission">입학 / 어학 / 서류</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="targetField">전공 계열</label>
                <select
                  id="targetField"
                  value={targetField}
                  onChange={(e) => setTargetField(e.target.value)}
                >
                  <option value="music">음대 / 음악</option>
                  <option value="art">미대 / 미술·디자인</option>
                  <option value="engineering">공대 / IT / 과학</option>
                  <option value="humanities">인문 / 상경</option>
                </select>
              </div>
            </div>
          ) : (
            /* 일반 카테고리일 때 노출되는 기본 지역 입력 필드 */
            <div className="form-group">
              <label htmlFor="region">지역</label>
              <input
                id="region"
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="예: Frankfurt"
              />
            </div>
          )}

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
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={8}
              required
            />
          </div>

          {message && <p className="form-message">{message}</p>}

          <button type="submit" className="submit-btn">
            게시글 등록
          </button>
        </form>
      </div>
    </main>
  );
}