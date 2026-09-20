"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Post {
  id: number;
  title: string;
  category: string;
  region: string;
  created_at: string;
}

const CATEGORIES: Record<string, string> = {
  community: "커뮤니티",
  education: "유학·교육",
  life: "생활정보",
  market: "중고장터",
  jobs: "구인구직",
  events: "행사",
};

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  
  const [message, setMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadUserData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인이 필요합니다.");
        router.push("/auth");
        return;
      }

      setEmail(user.email || "");

      // 1. profiles 테이블에서 정보 가져오기
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || user.email?.split("@")[0] || "");
        setAvatarUrl(profile.avatar_url || "");
      } else {
        setDisplayName(user.email?.split("@")[0] || "");
      }

      // 2. 내가 쓴 글 가져오기 (author_id 기준으로 조회)
      const { data: posts } = await supabase
        .from("posts")
        .select("id, title, category, region, created_at")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false });

      if (posts) {
        setMyPosts(posts);
      }

      setLoading(false);
    }

    loadUserData();
  }, [router]);

  // 프로필 정보(닉네임) 저장
  async function handleProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      setMessage("프로필 수정 실패: " + error.message);
      return;
    }

    setMessage("프로필이 성공적으로 변경되었습니다.");
    router.refresh();
  }

  // 아바타 이미지 업로드 핸들러
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Supabase Storage 'avatars' 버킷에 업로드
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 2. 공개 URL 가져오기
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // 3. DB profiles 테이블에 avatar_url 확실하게 update 및 에러 확인
      const { error: dbError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
        })
        .eq("id", user.id);

      if (dbError) throw dbError;

      setAvatarUrl(publicUrl);
      alert("프로필 이미지가 변경되었습니다!");
      router.refresh();
    } catch (error: any) {
      alert("이미지 저장 중 오류가 발생했습니다: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  // 비밀번호 변경 핸들러
  async function handlePasswordChange(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordMessage("");

    if (newPassword.length < 6) {
      setPasswordMessage("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordMessage("비밀번호 변경 실패: " + error.message);
      return;
    }

    setPasswordMessage("비밀번호가 성공적으로 변경되었습니다.");
    setNewPassword("");
  }

  // 로그아웃
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
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
      <div className="post-form-container" style={{ maxWidth: "800px" }}>
        <h1>마이페이지 (프로필 관리)</h1>

        {/* 1. 프로필 이미지 및 기본 정보 섹션 */}
        <div style={{ display: "flex", gap: "30px", alignItems: "center", marginBottom: "30px", background: "#f8fafc", padding: "20px", borderRadius: "10px" }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                background: "#cbd5e1",
                overflow: "hidden",
                margin: "0 auto 10px auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: "#fff", fontSize: "28px" }}>👤</span>
              )}
            </div>
            <label style={{ fontSize: "12px", background: "#2563eb", color: "#fff", padding: "6px 12px", borderRadius: "4px", cursor: "pointer" }}>
              {uploading ? "업로드 중..." : "사진 변경"}
              <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} disabled={uploading} />
            </label>
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 5px 0", fontSize: "14px", color: "#64748b" }}>로그인 계정</p>
            <p style={{ margin: "0 0 15px 0", fontSize: "16px", fontWeight: "bold" }}>{email}</p>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>독일 거주 한인 커뮤니티 German Hanguk에서 활동 중이신 회원님입니다.</p>
          </div>
        </div>

        {/* 2. 닉네임 수정 폼 */}
        <form className="post-form" onSubmit={handleProfileSubmit} style={{ marginBottom: "40px" }}>
          <h2>기본 정보 수정</h2>
          <div className="form-group">
            <label htmlFor="displayName">닉네임 (별명)</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="커뮤니티에서 사용할 닉네임을 입력하세요"
              required
            />
          </div>

          {message && (
            <p className="form-message" style={{ color: message.includes("성공") ? "#16a34a" : "#dc2626" }}>
              {message}
            </p>
          )}

          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? "저장 중..." : "프로필 정보 저장"}
          </button>
        </form>

        {/* 3. 비밀번호 변경 폼 */}
        <form className="post-form" onSubmit={handlePasswordChange} style={{ marginBottom: "40px", borderTop: "1px solid #e5e5e5", paddingTop: "30px" }}>
          <h2>비밀번호 변경</h2>
          <div className="form-group">
            <label htmlFor="newPassword">새 비밀번호 (6자 이상)</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="새로운 비밀번호를 입력하세요"
              required
            />
          </div>

          {passwordMessage && (
            <p className="form-message" style={{ color: passwordMessage.includes("성공") ? "#16a34a" : "#dc2626" }}>
              {passwordMessage}
            </p>
          )}

          <button type="submit" className="submit-btn" style={{ background: "#475569" }}>
            비밀번호 변경하기
          </button>
        </form>

        {/* 4. 내가 작성한 글 목록 */}
        <div style={{ borderTop: "1px solid #e5e5e5", paddingTop: "30px", marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", marginBottom: "20px" }}>내가 작성한 글 ({myPosts.length})</h2>

          {myPosts.length === 0 ? (
            <p style={{ color: "#666", textAlign: "center", padding: "20px 0" }}>작성한 게시글이 없습니다.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {myPosts.map((post) => (
                <div
                  key={post.id}
                  style={{
                    padding: "14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    background: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: "bold", marginRight: "8px" }}>
                      {CATEGORIES[post.category] || post.category}
                    </span>
                    <Link href={`/posts/${post.id}`} style={{ fontSize: "15px", fontWeight: "500", color: "#111", textDecoration: "none" }}>
                      {post.title}
                    </Link>
                  </div>
                  <div style={{ fontSize: "13px", color: "#888" }}>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. 하단 계정 액션 (로그아웃 및 홈 이동) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e5e5e5", paddingTop: "20px" }}>
          <Link href="/" style={{ color: "#666", fontSize: "14px", textDecoration: "none" }}>
            ← 메인으로 돌아가기
          </Link>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </main>
  );
}