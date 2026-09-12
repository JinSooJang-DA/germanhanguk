"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인이 필요합니다.");
        router.push("/auth");
        return;
      }

      setEmail(user.email || "");

      // profiles 테이블에서 내 정보 가져오기
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      if (profile?.display_name) {
        setDisplayName(profile.display_name);
      } else {
        setDisplayName(user.email?.split("@")[0] || "");
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // update 대신 upsert 사용 (데이터가 없으면 자동 insert)
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        display_name: displayName,
      });

    setSaving(false);

    if (error) {
      setMessage("수정 실패: " + error.message);
      return;
    }

    setMessage("프로필이 성공적으로 변경되었습니다.");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="new-post-page">
        <div className="post-form-container" style={{ textAlign: "center", padding: "40px" }}>
          <p>프로필 정보를 불러오는 중입니다...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="new-post-page">
      <div className="post-form-container">
        <h1>내 프로필 수정</h1>

        <form className="post-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>이메일 (계정)</label>
            <input type="email" value={email} disabled style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }} />
          </div>

          <div className="form-group">
            <label htmlFor="displayName">닉네임</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="사용할 닉네임을 입력하세요"
              required
            />
          </div>

          {message && (
            <p className="form-message" style={{ color: message.includes("성공") ? "#16a34a" : "#dc2626" }}>
              {message}
            </p>
          )}

          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? "저장 중..." : "닉네임 저장"}
          </button>
        </form>

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <Link href="/" style={{ color: "#666", fontSize: "14px" }}>
            ← 메인으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}