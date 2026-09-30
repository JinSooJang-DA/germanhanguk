"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date";
import { shouldDisplayPostRegion } from "@/lib/constants";
import { PublicProfile } from "@/types/profile";

interface UserPost {
  id: string | number;
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

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 쪽지 보내기 모달 관련 상태
  const [showModal, setShowModal] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendErrorMessage, setSendErrorMessage] = useState("");

  useEffect(() => {
    async function loadPublicProfile() {
      setLoading(true);
      setNotFound(false);

      // 1. 현재 로그인 사용자 확인 (본인 여부 판단)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserId(user.id);
        setIsOwnProfile(user.id === id);
      } else {
        setCurrentUserId(null);
        setIsOwnProfile(false);
      }

      // 2. 공개 프로필 정보 조회
      // * 보안: email, metadata 등 개인정보를 제외하고 오직 공개 허용 컬럼만 명시적으로 조회
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, region, avatar_url, bio, created_at")
        .eq("id", id)
        .single();

      if (profileError || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // 3. 해당 사용자가 작성한 게시글 목록 조회
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("id, title, category, region, created_at")
        .eq("author_id", id)
        .order("created_at", { ascending: false });

      if (!postsError && postsData) {
        setPosts(postsData);
      }

      setLoading(false);
    }

    loadPublicProfile();
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showModal && !sendingMessage) {
        setShowModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showModal, sendingMessage]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (sendingMessage) return;
    const trimmed = messageBody.trim();
    if (!trimmed) {
      alert("메시지 내용을 입력해 주세요.");
      return;
    }
    if (trimmed.length > 2000) {
      alert("메시지는 최대 2000자까지 작성할 수 있습니다.");
      return;
    }

    setSendingMessage(true);
    setSendErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인이 필요합니다.");
        setSendingMessage(false);
        return;
      }

      if (user.id === id) {
        alert("자기 자신에게는 쪽지를 보낼 수 없습니다.");
        setSendingMessage(false);
        return;
      }

      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: id,
        body: trimmed,
      });

      if (error) {
        console.error("Message send error:", error);
        setSendErrorMessage("쪽지 전송에 실패했습니다. 다시 시도해 주세요.");
        setSendingMessage(false);
        return;
      }

      setSendingMessage(false);
      setMessageBody("");
      setShowModal(false);
      window.dispatchEvent(new Event("messages-updated"));
      alert("쪽지를 보냈습니다.");
    } catch (err) {
      console.error("Unexpected error:", err);
      setSendErrorMessage("쪽지 전송 중 오류가 발생했습니다.");
      setSendingMessage(false);
    }
  }

  if (loading) {
    return (
      <main className="post-detail" style={{ minHeight: "60vh" }}>
        <div className="wrapper" style={{ padding: "60px 20px", textAlign: "center" }}>
          <p style={{ color: "#64748b" }}>프로필을 불러오는 중입니다...</p>
        </div>
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className="post-detail" style={{ minHeight: "60vh", display: "flex", alignItems: "center" }}>
        <div className="wrapper" style={{ textAlign: "center", maxWidth: "500px", margin: "0 auto", padding: "60px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
          <h2 style={{ fontSize: "22px", color: "#0f172a", marginBottom: "12px" }}>프로필을 찾을 수 없습니다</h2>
          <p style={{ color: "#64748b", marginBottom: "24px", lineHeight: "1.6", fontSize: "14px" }}>
            존재하지 않거나 삭제된 사용자의 프로필입니다. 주소를 다시 확인해 주세요.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "10px 22px",
              background: "#0f172a",
              color: "#fff",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            ← 홈으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  const joinDate = profile.created_at
    ? formatDate(profile.created_at)
    : "-";

  return (
    <main className="post-detail" style={{ minHeight: "70vh", padding: "40px 0 80px" }}>
      <div className="wrapper" style={{ maxWidth: "860px", margin: "0 auto", padding: "0 20px" }}>
        <Link href="/" className="back-link" style={{ display: "inline-block", marginBottom: "24px" }}>
          ← 홈으로 돌아가기
        </Link>

        {/* 1. 상단 공개 프로필 카드 */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "32px",
            marginBottom: "40px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            {/* 아바타 이미지 */}
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                background: "#f1f5f9",
                border: "2px solid #e2e8f0",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || "사용자 프로필"}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: "40px" }}>👤</span>
              )}
            </div>

            {/* 사용자 주요 정보 */}
            <div style={{ flex: 1, minWidth: "260px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "8px",
                }}
              >
                <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "bold", color: "#0f172a" }}>
                  {profile.display_name || "회원"}
                </h1>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {/* 본인 프로필일 때 노출되는 수정 버튼 */}
                  {isOwnProfile && (
                    <Link
                      href="/profile"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 14px",
                        background: "#f1f5f9",
                        color: "#334155",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: 500,
                        textDecoration: "none",
                        transition: "background 0.2s ease",
                      }}
                    >
                      ✏️ 내 프로필 수정
                    </Link>
                  )}

                  {/* 타인 프로필이면서 로그인한 사용자일 때 노출되는 쪽지 보내기 버튼 */}
                  {currentUserId && !isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setMessageBody("");
                        setSendErrorMessage("");
                        setShowModal(true);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 14px",
                        background: "#0f172a",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      ✉️ 쪽지 보내기
                    </button>
                  )}
                </div>
              </div>

              {/* 거주지역 및 가입일 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  fontSize: "14px",
                  color: "#64748b",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                }}
              >
                {profile.region && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    📍 {profile.region}
                  </span>
                )}
                <span>📅 가입일: {joinDate}</span>
              </div>

              {/* 자기소개 */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #f1f5f9",
                  borderRadius: "8px",
                  padding: "14px 16px",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  color: profile.bio ? "#334155" : "#94a3b8",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {profile.bio || "자기소개가 아직 등록되지 않았습니다."}
              </div>
            </div>
          </div>
        </div>

        {/* 2. 하단: 이 사용자가 작성한 글 섹션 */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#0f172a", margin: 0 }}>
              이 사용자가 작성한 글 ({posts.length})
            </h2>
          </div>

          {posts.length === 0 ? (
            <div
              style={{
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: "8px",
                padding: "48px 20px",
                textAlign: "center",
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              아직 작성한 글이 없습니다.
            </div>
          ) : (
            <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  overflow: "hidden",
                  minWidth: "600px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "12px 16px", fontSize: "13px", color: "#475569", width: "120px" }}>
                      카테고리
                    </th>
                    <th style={{ padding: "12px 16px", fontSize: "13px", color: "#475569" }}>
                      제목
                    </th>
                    <th style={{ padding: "12px 16px", fontSize: "13px", color: "#475569", width: "120px" }}>
                      지역
                    </th>
                    <th style={{ padding: "12px 16px", fontSize: "13px", color: "#475569", width: "120px" }}>
                      작성일
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr
                      key={post.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748b" }}>
                        {CATEGORIES[post.category] || post.category}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <Link
                          href={`/posts/${post.id}`}
                          style={{
                            textDecoration: "none",
                            color: "#0f172a",
                            fontWeight: 500,
                            fontSize: "14px",
                          }}
                        >
                          {post.title}
                        </Link>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748b" }}>
                        {shouldDisplayPostRegion(post.category, post.region) ? post.region : ""}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "#94a3b8" }}>
                        {formatDate(post.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 쪽지 보내기 모달 */}
        {showModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(2px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "20px",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !sendingMessage) {
                setShowModal(false);
              }
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                width: "100%",
                maxWidth: "500px",
                padding: "28px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "#e2e8f0",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.display_name || "회원"}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontSize: "16px" }}>👤</span>
                    )}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", color: "#0f172a" }}>
                      {profile.display_name || "회원"}님에게 쪽지 보내기
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !sendingMessage && setShowModal(false)}
                  disabled={sendingMessage}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "20px",
                    cursor: sendingMessage ? "not-allowed" : "pointer",
                    color: "#94a3b8",
                    padding: "4px",
                  }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendMessage}>
                <div style={{ marginBottom: "16px" }}>
                  <textarea
                    autoFocus
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="상대방에게 전할 내용을 입력하세요... (최대 2000자)"
                    maxLength={2000}
                    rows={6}
                    disabled={sendingMessage}
                    required
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      resize: "vertical",
                      boxSizing: "border-box",
                      lineHeight: "1.6",
                      fontFamily: "inherit",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "6px",
                      fontSize: "12px",
                      color: "#94a3b8",
                    }}
                  >
                    <span>최대 2,000자</span>
                    <span style={{ color: messageBody.length >= 1900 ? "#ef4444" : "#94a3b8", fontWeight: messageBody.length >= 1900 ? "600" : "normal" }}>{messageBody.length} / 2,000자</span>
                  </div>
                </div>

                {sendErrorMessage && (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "6px",
                      color: "#b91c1c",
                      fontSize: "13px",
                      marginBottom: "16px",
                    }}
                  >
                    {sendErrorMessage}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={sendingMessage}
                    style={{
                      padding: "8px 16px",
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: sendingMessage ? "not-allowed" : "pointer",
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={sendingMessage || !messageBody.trim()}
                    style={{
                      padding: "8px 20px",
                      background: sendingMessage || !messageBody.trim() ? "#94a3b8" : "#0f172a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: sendingMessage || !messageBody.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    {sendingMessage ? "전송 중..." : "보내기"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
