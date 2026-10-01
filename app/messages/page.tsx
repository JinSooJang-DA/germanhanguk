"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { MessageWithProfile } from "@/types/message";
import { formatConciseDate } from "@/lib/date";
import { User } from "@supabase/supabase-js";

export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"inbox" | "sent">("inbox");
  const [messages, setMessages] = useState<MessageWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initUserAndLoad() {
      setIsAuthChecking(true);
      setError(null);
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
          router.push("/auth");
          return;
        }

        setUser(currentUser);
        setIsAuthChecking(false);
        fetchMessages(currentUser.id, activeTab);
      } catch (err) {
        console.error("Auth init error:", err);
        setError("로그인 정보를 확인하는데 실패했습니다.");
        setIsAuthChecking(false);
        setLoading(false);
      }
    }

    initUserAndLoad();
  }, [router, activeTab]);

  async function fetchMessages(userId: string, tab: "inbox" | "sent") {
    setLoading(true);
    setError(null);

    try {
      const query = supabase
        .from("messages")
        .select("id, sender_id, receiver_id, body, created_at, read_at");

      if (tab === "inbox") {
        query.eq("receiver_id", userId);
      } else {
        query.eq("sender_id", userId);
      }

      const { data: messagesData, error: msgError } = await query.order(
        "created_at",
        { ascending: false }
      );

      if (msgError || !messagesData) {
        console.error("Messages fetch error:", msgError);
        setError("쪽지 목록을 불러오지 못했습니다. 다시 시도해 주세요.");
        setMessages([]);
        return;
      }

      // 상대방 ID 목록 추출
      const partnerIds = Array.from(
        new Set(
          messagesData
            .map((m) => (tab === "inbox" ? m.sender_id : m.receiver_id))
            .filter(Boolean)
        )
      );

      let profileMap: Record<
        string,
        { id: string; display_name: string | null; avatar_url: string | null }
      > = {};

      if (partnerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", partnerIds);

        if (profilesData) {
          profileMap = Object.fromEntries(profilesData.map((p) => [p.id, p]));
        }
      }

      const combined: MessageWithProfile[] = messagesData.map((m) => ({
        ...m,
        sender: tab === "inbox" ? profileMap[m.sender_id] || null : null,
        receiver: tab === "sent" ? profileMap[m.receiver_id] || null : null,
      }));

      setMessages(combined);
    } catch (err) {
      console.error("Unexpected messages fetch error:", err);
      setError("쪽지 목록을 불러오지 못했습니다. 다시 시도해 주세요.");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }



  if (isAuthChecking) {
    return (
      <main style={{ minHeight: "75vh", padding: "80px 0", background: "var(--gh-page-bg)", textAlign: "center" }}>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "15px", fontWeight: "500" }}>
          로그인 상태를 확인하고 있습니다. 잠시만 기다려 주세요...
        </p>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "75vh", padding: "40px 0 80px", background: "var(--gh-page-bg)" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0 20px" }}>
        {/* 상단 타이틀 */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "var(--gh-text)", margin: "0 0 8px" }}>
            ✉️ 쪽지함
          </h1>
          <p style={{ color: "var(--gh-text-muted)", fontSize: "14px", margin: 0 }}>
            회원들과 주고받은 1:1 쪽지 목록입니다.
          </p>
        </div>

        {/* 탭 네비게이션 */}
        <div
          style={{
            display: "flex",
            borderBottom: "2px solid var(--gh-border)",
            marginBottom: "24px",
            background: "var(--gh-surface)",
            borderRadius: "8px 8px 0 0",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("inbox")}
            style={{
              flex: 1,
              padding: "16px 20px",
              background: activeTab === "inbox" ? "var(--gh-surface)" : "var(--gh-page-bg)",
              border: "none",
              borderBottom: activeTab === "inbox" ? "3px solid var(--gh-text)" : "3px solid transparent",
              color: activeTab === "inbox" ? "var(--gh-text)" : "var(--gh-text-muted)",
              fontWeight: activeTab === "inbox" ? "700" : "500",
              fontSize: "15px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            📥 받은 쪽지함
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sent")}
            style={{
              flex: 1,
              padding: "16px 20px",
              background: activeTab === "sent" ? "var(--gh-surface)" : "var(--gh-page-bg)",
              border: "none",
              borderBottom: activeTab === "sent" ? "3px solid var(--gh-text)" : "3px solid transparent",
              color: activeTab === "sent" ? "var(--gh-text)" : "var(--gh-text-muted)",
              fontWeight: activeTab === "sent" ? "700" : "500",
              fontSize: "15px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            📤 보낸 쪽지함
          </button>
        </div>

        {/* 쪽지 목록 컨테이너 */}
        <div
          style={{
            background: "var(--gh-surface)",
            border: "1px solid var(--gh-border)",
            borderRadius: "0 0 10px 10px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--gh-text-muted)", fontSize: "14px" }}>
              쪽지를 불러오는 중입니다...
            </div>
          ) : error ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--gh-alert)" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>⚠️</div>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--gh-alert)", marginBottom: "6px" }}>{error}</div>
              <button
                type="button"
                onClick={() => user && fetchMessages(user.id, activeTab)}
                style={{
                  padding: "6px 14px",
                  background: "var(--gh-surface-muted)",
                  color: "var(--gh-text-muted)",
                  border: "1px solid var(--gh-border)",
                  borderRadius: "6px",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                다시 시도
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--gh-text-subtle)" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>{activeTab === "inbox" ? "📥" : "📤"}</div>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--gh-text-muted)", marginBottom: "4px" }}>
                {activeTab === "inbox" ? "받은 쪽지가 없습니다." : "보낸 쪽지가 없습니다."}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--gh-text-subtle)" }}>
                {activeTab === "inbox" ? "새로운 쪽지가 도착하면 여기에 표시됩니다." : "다른 회원에게 쪽지를 보내보세요!"}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {messages.map((msg) => {
                const partner = activeTab === "inbox" ? msg.sender : msg.receiver;
                const partnerName = partner?.display_name || "회원";
                const isUnread = activeTab === "inbox" && msg.read_at === null;

                return (
                  <Link
                    key={msg.id}
                    href={`/messages/${msg.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "18px 22px",
                      borderBottom: "1px solid var(--gh-surface-muted)",
                      textDecoration: "none",
                      color: "inherit",
                      background: isUnread ? "color-mix(in srgb, var(--gh-accent) 10%, var(--gh-surface))" : "var(--gh-surface)",
                      transition: "background 0.15s ease",
                    }}
                  >
                    {/* 상대방 아바타 */}
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        background: "var(--gh-border)",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {partner?.avatar_url ? (
                        <img
                          src={partner.avatar_url}
                          alt={partnerName}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ fontSize: "18px" }}>👤</span>
                      )}
                    </div>

                    {/* 쪽지 내용 영역 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "4px",
                          gap: "8px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: isUnread ? "700" : "600",
                              color: "var(--gh-text)",
                            }}
                          >
                            {activeTab === "inbox" ? `보낸사람: ${partnerName}` : `받는사람: ${partnerName}`}
                          </span>
                          {isUnread && (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                background: "var(--gh-accent)",
                                color: "var(--gh-surface)",
                                fontSize: "11px",
                                fontWeight: "bold",
                                borderRadius: "10px",
                              }}
                            >
                              NEW
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: "12px", color: "var(--gh-text-subtle)", flexShrink: 0 }}>
                          {formatConciseDate(msg.created_at)}
                        </span>
                      </div>

                      {/* 메시지 미리보기 */}
                      <p
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          color: isUnread ? "var(--gh-text)" : "var(--gh-text-muted)",
                          fontWeight: isUnread ? "500" : "normal",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {msg.body}
                      </p>
                    </div>

                    {/* 읽음 상태 표시 */}
                    <div style={{ flexShrink: 0, textAlign: "right", minWidth: "60px" }}>
                      {activeTab === "inbox" ? (
                        <span
                          style={{
                            fontSize: "12px",
                            color: isUnread ? "var(--gh-accent)" : "var(--gh-text-subtle)",
                            fontWeight: isUnread ? "600" : "normal",
                          }}
                        >
                          {isUnread ? "안읽음" : "읽음"}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "12px",
                            color: msg.read_at ? "var(--gh-text-muted)" : "var(--gh-warning)",
                            fontWeight: "500",
                          }}
                        >
                          {msg.read_at ? "상대방 읽음" : "안읽음"}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
