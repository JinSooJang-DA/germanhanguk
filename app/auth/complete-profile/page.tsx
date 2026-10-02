"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GERMAN_REGIONS } from "@/lib/germanRegions";
import { supabase } from "@/lib/supabase";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [region, setRegion] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) { router.replace("/auth"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, region")
        .eq("id", user.id)
        .maybeSingle();

      setDisplayName(profile?.display_name || user.user_metadata?.full_name || "");
      setRegion(profile?.region || "");
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = displayName.trim();
    if (name.length < 2) { setMessage("닉네임은 2자 이상 입력해 주세요."); return; }
    if (!region) { setMessage("거주지역을 선택해 주세요."); return; }

    setSaving(true);
    setMessage("");
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) { router.replace("/auth"); return; }

    const { error } = await supabase.from("profiles").update({ display_name: name, region }).eq("id", user.id);
    setSaving(false);
    if (error) { setMessage("프로필을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."); return; }

    router.replace("/profile");
    router.refresh();
  }

  if (loading) return <main className="auth-page"><div className="auth-box auth-status-box"><p>프로필을 준비하고 있어요...</p></div></main>;

  return (
    <main className="auth-page">
      <div className="auth-box">
        <h1>German Hanguk</h1>
        <h2>프로필 완성하기</h2>
        <p className="auth-intro">소셜 로그인은 연결됐어요. 커뮤니티에서 사용할 정보만 정해주세요.</p>
        <form onSubmit={handleSubmit}>
          <label>닉네임 (별명)<input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} minLength={2} maxLength={30} required /></label>
          <label>거주지역<select value={region} onChange={(e) => setRegion(e.target.value)} required><option value="">거주지역을 선택하세요</option>{GERMAN_REGIONS.map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
          <button className="auth-primary-action" type="submit" disabled={saving}>{saving ? "저장 중..." : "German Hanguk 시작하기"}</button>
        </form>
        {message && <p className="auth-message" style={{ color: "var(--gh-alert)", fontWeight: 500 }}>{message}</p>}
      </div>
    </main>
  );
}
