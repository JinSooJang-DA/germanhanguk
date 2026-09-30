"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Message, MessagePartnerProfile } from "@/types/message";
import { formatDateTime } from "@/lib/date";
import { User } from "@supabase/supabase-js";

export default function MessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [senderProfile, setSenderProfile] = useState<MessagePartnerProfile | null>(null);
  const [receiverProfile, setReceiverProfile] = useState<MessagePartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // 답장 모달 관련 상태
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyErrorMessage, setReplyErrorMessage] = useState("");

  useEffect(() => {
    async function loadMessage() {
      setLoading(true);
      setNotFound(false);

      // 1. 로그인 사용자 확인
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push("/auth");
        return;
      }
      setUser(currentUser);

      // 2. 쪽지 단건 조회 (RLS에 의해 본인이 발신자이거나 수신자인 경우만 성공)
      const { data: msgData, error: msgError } = await supabase
        .from("messages")
        .select("id, sender_id, receiver_id, body, created_at, read_at")
        .eq("id", id)
        .single();

      if (msgError || !msgData) {
        console.error("Message load error:", msgError);
        setNotFound(true);
        setLoading(false);
        return;
      }

      // 3. 수신자가 최초 열람 시 자동 읽음 처리
      if (currentUser.id === msgData.receiver_id && msgData.read_at === null) {
        const nowIso = new Date().toISOString();
        msgData.read_at = nowIso;

        // DB 업데이트를 수행한 후, 성공 시점에 이벤트를 전송하여 헤더를 동기화합니다.
        supabase
          .from("messages")
          .update({ read_at: nowIso })
          .eq("id", id)
          .then(function({ error: updateError }) {
            if (updateError) {
              console.warn("Message read_at background update warning:", updateError.message);
            } else {
              window.dispatchEvent(new Event("messages-updated"));
            }
          });
      }

      setMessage(msgData);

      // 4. 발신자 및 수신자 프로필 조회
      const profileIds = Array.from(new Set([msgData.sender_id, msgData.receiver_id]));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", profileIds);

      if (profiles) {
        const s = profiles.find((p) => p.id === msgData.sender_id) || null;
        const r = profiles.find((p) => p.id === msgData.receiver_id) || null;
        setSenderProfile(s);
        setReceiverProfile(r);
      }

      setLoading(false);
    }

    loadMessage();
  }, [id, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showReplyModal && !sendingReply) {
        setShowReplyModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showReplyModal, sendingReply]);

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (sendingReply) return;
    if (!user || !message || !senderProfile) return;

    const trimmed = replyBody.trim();
    if (!trimmed) {
      alert("답장 내용을 입력해 주세요.");
      return;
    }
    if (trimmed.length > 2000) {
      alert("답장은 최대 2000자까지 작성할 수 있습니다.");
      return;
    }

    setSendingReply(true);
    setReplyErrorMessage("");

    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: message.sender_id,
        body: trimmed,
      });

      if (error) {
        console.error("Reply error:", error);
        setReplyErrorMessage("답장 전송에 실패했습니다. 다시 시도해 주세요.");
        setSendingReply(false);
        return;
      }

      setSendingReply(false);
      setReplyBody("");
      setShowReplyModal(false);
      window.dispatchEvent(new Event("messages-updated"));
      alert("답장을 보냈습니다.");
    } catch (err) {
      console.error("Unexpected error:", err);
      setReplyErrorMessage("답장 전송 중 오류가 발생했습니다.");
      setSendingReply(false);
    }
  }

  if (loading) {
    return (
      <main style={{ minHeight: "70vh", padding: "60px 20px", textAlign: "center" }}>
        <p style={{ color: "#64748b" }}>쪽지를 불러오는 중입니다...</p>
      </main>
    );
  }

  if (notFound || !message) {
    return (
      <main style={{ minHeight: "70vh", padding: "60px 20px" }}>
        <div style={{ maxWidth: "500px", margin: "40px auto", textAlign: "center" }}>
          <div style={{ fontSize: "44px", marginBottom: "16px" }}>🔍</div>
          <h2 style={{ fontSize: "20px", color: "#0f172a", marginBottom: "10px" }}>
            쪽지를 찾을 수 없습니다
          </h2>
          <p style={{ color: "#64748b", fontSize: "14px", lineHeight: "1.6", marginBottom: "24px" }}>
            존재하지 않거나 열람 권한이 없는 쪽지입니다.
          </p>
          <Link
            href="/messages"
            style={{
              display: "inline-block",
              padding: "10px 20px",
              background: "#0f172a",
              color: "#fff",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            ← 쪽지함으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  const isReceiver = user?.id === message.receiver_id;
  const partnerProfile = isReceiver ? senderProfile : receiverProfile;
  const partnerLabel = isReceiver ? "보낸사람" : "받는사람";
  const partnerName = partnerProfile?.display_name || "회원";

  return (
    <main style={{ minHeight: "75vh", padding: "40px 0 80px", background: "#f8fafc" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 20px" }}>
        {/* 상단 네비게이션 */}
        <Link
          href="/messages"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#64748b",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 500,
            marginBottom: "24px",
          }}
        >
          ← 쪽지함으로 돌아가기
        </Link>

        {/* 쪽지 상세 카드 */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}
        >
          {/* 카드 상단 헤더 */}
          <div
            style={{
              padding: "24px 28px",
              borderBottom: "1px solid #f1f5f9",
              background: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {/* 상대방 프로필 아바타 (공개 프로필 링크) */}
              <Link
                href={`/profile/${partnerProfile?.id || (isReceiver ? message.sender_id : message.receiver_id)}`}
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "#e2e8f0",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  textDecoration: "none",
                }}
              >
                {partnerProfile?.avatar_url ? (
                  <img
                    src={partnerProfile.avatar_url}
                    alt={partnerName}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: "22px" }}>👤</span>
                )}
              </Link>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>{partnerLabel}:</span>
                  <Link
                    href={`/profile/${partnerProfile?.id || (isReceiver ? message.sender_id : message.receiver_id)}`}
                    style={{
                      fontSize: "16px",
                      fontWeight: "bold",
                      color: "#0f172a",
                      textDecoration: "none",
                    }}
                  >
                    {partnerName}
                  </Link>
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8", display: "flex", gap: "12px" }}>
                  <span>전송: {formatDateTime(message.created_at)}</span>
                  {message.read_at ? (
                    <span style={{ color: "#16a34a" }}>
                      읽음: {formatDateTime(message.read_at)}
                    </span>
                  ) : (
                    <span style={{ color: "#f59e0b" }}>안읽음</span>
                  )}
                </div>
              </div>
            </div>

            {/* 수신자인 경우: 답장하기 버튼 */}
            {isReceiver && (
              <button
                type="button"
                onClick={() => {
                  setReplyBody("");
                  setReplyErrorMessage("");
                  setShowReplyModal(true);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                ✉️ 답장하기
              </button>
            )}
          </div>

          {/* 본문 내용 */}
          <div style={{ padding: "32px 28px", minHeight: "200px" }}>
            <div
              style={{
                fontSize: "15px",
                lineHeight: "1.8",
                color: "#1e293b",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {message.body}
            </div>
          </div>
        </div>

        {/* 답장 모달 */}
        {showReplyModal && (
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
              if (e.target === e.currentTarget && !sendingReply) {
                setShowReplyModal(false);
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
                <h3 style={{ margin: 0, fontSize: "16px", color: "#0f172a" }}>
                  {senderProfile?.display_name || "회원"}님에게 답장 보내기
                </h3>
                <button
                  type="button"
                  onClick={() => !sendingReply && setShowReplyModal(false)}
                  disabled={sendingReply}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "20px",
                    cursor: sendingReply ? "not-allowed" : "pointer",
                    color: "#94a3b8",
                  }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendReply}>
                <div style={{ marginBottom: "16px" }}>
                  <textarea
                    autoFocus
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="답장 내용을 입력하세요... (최대 2000자)"
                    maxLength={2000}
                    rows={6}
                    disabled={sendingReply}
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
                    <span style={{ color: replyBody.length >= 1900 ? "#ef4444" : "#94a3b8", fontWeight: replyBody.length >= 1900 ? "600" : "normal" }}>{replyBody.length} / 2,000자</span>
                  </div>
                </div>

                {replyErrorMessage && (
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
                    {replyErrorMessage}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setShowReplyModal(false)}
                    disabled={sendingReply}
                    style={{
                      padding: "8px 16px",
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: sendingReply ? "not-allowed" : "pointer",
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={sendingReply || !replyBody.trim()}
                    style={{
                      padding: "8px 20px",
                      background: sendingReply || !replyBody.trim() ? "#94a3b8" : "#0f172a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: sendingReply || !replyBody.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    {sendingReply ? "전송 중..." : "답장 보내기"}
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
