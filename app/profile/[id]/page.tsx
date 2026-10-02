"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date";
import { shouldDisplayPostRegion } from "@/lib/constants";
import { PublicProfile } from "@/types/profile";
import CommunityIdentity from "@/components/CommunityIdentity";
import { COMMUNITY_REPUTATION_ENABLED } from "@/lib/communityReputation";

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

  // Independent loading and error states
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileRetryKey, setProfileRetryKey] = useState(0);

  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  // 쪽지 보내기 모달 관련 상태
  const [showModal, setShowModal] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendErrorMessage, setSendErrorMessage] = useState("");

  async function fetchUserPosts(authorId: string) {
    setPostsLoading(true);
    setPostsError(null);
    try {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("id, title, category, region, created_at")
        .eq("author_id", authorId)
        .order("created_at", { ascending: false });

      if (postsError) {
        console.error("User posts fetch error:", postsError);
        setPostsError("작성한 글을 불러오지 못했습니다.");
        setPosts([]);
        return;
      }

      setPosts(postsData || []);
    } catch (err) {
      console.error("Unexpected user posts fetch error:", err);
      setPostsError("작성한 글을 불러오지 못했습니다.");
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }

  function handleRetryPosts() {
    fetchUserPosts(id);
  }

  function handleRetryProfile() {
    setProfileRetryKey((prev) => prev + 1);
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadPublicProfile() {
      setLoading(true);
      setNotFound(false);
      setProfileError(null);

      try {
        // 1. 현재 로그인 사용자 확인 (본인 여부 판단)
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (isCurrent) {
          if (user) {
            setCurrentUserId(user.id);
            setIsOwnProfile(user.id === id);
          } else {
            setCurrentUserId(null);
            setIsOwnProfile(false);
          }
        }

        // 2. 공개 프로필 정보 조회
        // * 보안: email, metadata 등 개인정보를 제외하고 오직 공개 허용 컬럼만 명시적으로 조회
        const { data: profileData, error: pError } = await supabase
          .from("profiles")
          .select("id, display_name, region, avatar_url, bio, created_at")
          .eq("id", id)
          .maybeSingle();

        if (pError) {
          console.error("Profile load error:", pError);
          if (isCurrent) {
            setProfileError("프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
            setLoading(false);
          }
          return;
        }

        if (!profileData) {
          if (isCurrent) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }

        if (isCurrent) {
          if (COMMUNITY_REPUTATION_ENABLED) {
            const { data: reputation } = await supabase.from("profiles").select("germany_since, show_community_level, show_germany_tenure, show_reputation_stats, reputation_xp, activity_score, knowledge_score, communication_score, helpful_score").eq("id", id).single();
            setProfile({ ...profileData, ...(reputation || {}) });
          } else {
            setProfile(profileData);
          }
          setLoading(false);
        }

        // 3. 해당 사용자가 작성한 게시글 목록 조회
        if (isCurrent) {
          fetchUserPosts(id);
        }
      } catch (err) {
        console.error("Public profile load error:", err);
        if (isCurrent) {
          setProfileError("프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
          setLoading(false);
        }
      }
    }

    loadPublicProfile();

    return () => {
      isCurrent = false;
    };
  }, [id, profileRetryKey]);

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

  useEffect(() => {
    if (!showModal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [showModal]);

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

  if (profileError) {
    return (
      <main className="post-detail" style={{ minHeight: "60vh", display: "flex", alignItems: "center" }}>
        <div className="wrapper" style={{ textAlign: "center", maxWidth: "500px", margin: "0 auto", padding: "60px 20px" }}>
          <p style={{ marginBottom: "20px", color: "var(--gh-text-muted)" }}>{profileError}</p>
          <button
            type="button"
            onClick={handleRetryProfile}
            style={{
              display: "inline-block",
              padding: "10px 22px",
              background: "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
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
                        border: "1px solid var(--gh-border)",
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
              {COMMUNITY_REPUTATION_ENABLED && (profile.show_community_level || profile.show_germany_tenure) && (
                <div style={{ marginBottom: "10px" }}>
                  <CommunityIdentity xp={profile.reputation_xp} germanySince={profile.germany_since} showLevel={profile.show_community_level !== false} showTenure={profile.show_germany_tenure === true} />
                </div>
              )}

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

        {COMMUNITY_REPUTATION_ENABLED && profile.show_reputation_stats && (
          <section aria-label="community reputation" className="community-stats">
            {[ ["\uD65C\uB3D9", profile.activity_score || 0], ["\uC9C0\uC2DD", profile.knowledge_score || 0], ["\uC18C\uD1B5", profile.communication_score || 0], ["\uB3C4\uC6C0", profile.helpful_score || 0] ].map(([label, value]) => (
              <div key={String(label)} className="community-stats__item"><strong>{value}</strong><span>{label}</span></div>
            ))}
          </section>
        )}

        {/* 2. 하단: 이 사용자가 작성한 글 섹션 */}
        <section id="user-posts" style={{ scrollMarginTop: "96px" }}>
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

          {postsLoading ? (
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
              작성한 글을 불러오는 중입니다...
            </div>
          ) : postsError ? (
            <div
              style={{
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: "8px",
                padding: "36px 20px",
                textAlign: "center",
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              <p style={{ margin: "0 0 12px" }}>{postsError}</p>
              <button
                type="button"
                onClick={handleRetryPosts}
                style={{
                  padding: "6px 14px",
                  background: "#0f172a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                다시 시도
              </button>
            </div>
          ) : posts.length === 0 ? (
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
              role="dialog"
              aria-modal="true"
              aria-labelledby="send-message-title"
              style={{
                background: "var(--gh-surface)",
                borderRadius: "12px",
                width: "100%",
                maxWidth: "500px",
                maxHeight: "calc(100dvh - 40px)",
                overflowY: "auto",
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
                      background: "var(--gh-surface-muted)",
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
                    <h3 id="send-message-title" style={{ margin: 0, fontSize: "16px", color: "var(--gh-text)" }}>
                      {profile.display_name || "회원"}님에게 쪽지 보내기
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !sendingMessage && setShowModal(false)}
                  disabled={sendingMessage}
                  aria-label="쪽지 작성 창 닫기"
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "20px",
                    cursor: sendingMessage ? "not-allowed" : "pointer",
                    color: "var(--gh-text-subtle)",
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
                      border: "1px solid var(--gh-border)",
                      fontSize: "16px",
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
                      color: "var(--gh-text-subtle)",
                    }}
                  >
                    <span>최대 2,000자</span>
                    <span style={{ color: messageBody.length >= 1900 ? "var(--gh-alert)" : "var(--gh-text-subtle)", fontWeight: messageBody.length >= 1900 ? "600" : "normal" }}>{messageBody.length} / 2,000자</span>
                  </div>
                </div>

                {sendErrorMessage && (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "color-mix(in srgb, var(--gh-alert) 9%, var(--gh-surface))",
                      border: "1px solid color-mix(in srgb, var(--gh-alert) 34%, var(--gh-border))",
                      borderRadius: "6px",
                      color: "var(--gh-alert)",
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
                      background: "var(--gh-surface-muted)",
                      color: "var(--gh-text-muted)",
                      border: "1px solid var(--gh-border)",
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
                      background: sendingMessage || !messageBody.trim() ? "var(--gh-text-subtle)" : "var(--gh-control-active)",
                      color: "var(--gh-control-active-text)",
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
