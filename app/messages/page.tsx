"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { MessageWithProfile } from "@/types/message";
import { User } from "@supabase/supabase-js";

export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"inbox" | "sent">("inbox");
  const [messages, setMessages] = useState<MessageWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initUserAndLoad() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push("/auth");
        return;
      }

      setUser(currentUser);
      fetchMessages(currentUser.id, activeTab);
    }

    initUserAndLoad();
  }, [router, activeTab]);

  async function fetchMessages(userId: string, tab: "inbox" | "sent") {
    setLoading(true);

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
      setMessages([]);
      setLoading(false);
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
    setLoading(false);
  }

  return (
    <main style={{ minHeight: "75vh", padding: "40px 0 80px", background: "#f8fafc" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0 20px" }}>
        {/* 상단 타이틀 */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a", margin: "0 0 8px" }}>
            ✉️ 쪽지함
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
            회원들과 주고받은 1:1 쪽지 목록입니다.
          </p>
        </div>

        {/* 탭 네비게이션 */}
        <div
          style={{
            display: "flex",
            borderBottom: "2px solid #e2e8f0",
            marginBottom: "24px",
            background: "#ffffff",
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
              background: activeTab === "inbox" ? "#ffffff" : "#f8fafc",
              border: "none",
              borderBottom: activeTab === "inbox" ? "3px solid #0f172a" : "3px solid transparent",
              color: activeTab === "inbox" ? "#0f172a" : "#64748b",
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
              background: activeTab === "sent" ? "#ffffff" : "#f8fafc",
              border: "none",
              borderBottom: activeTab === "sent" ? "3px solid #0f172a" : "3px solid transparent",
              color: activeTab === "sent" ? "#0f172a" : "#64748b",
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
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "0 0 10px 10px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
              쪽지를 불러오는 중입니다...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
              {activeTab === "inbox" ? "받은 쪽지가 없습니다." : "보낸 쪽지가 없습니다."}
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
                      borderBottom: "1px solid #f1f5f9",
                      textDecoration: "none",
                      color: "inherit",
                      background: isUnread ? "#f0f7ff" : "#ffffff",
                      transition: "background 0.15s ease",
                    }}
                  >
                    {/* 상대방 아바타 */}
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        background: "#e2e8f0",
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
                              color: "#0f172a",
                            }}
                          >
                            {activeTab === "inbox" ? `보낸사람: ${partnerName}` : `받는사람: ${partnerName}`}
                          </span>
                          {isUnread && (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                background: "#2563eb",
                                color: "#ffffff",
                                fontSize: "11px",
                                fontWeight: "bold",
                                borderRadius: "10px",
                              }}
                            >
                              NEW
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: "12px", color: "#94a3b8", flexShrink: 0 }}>
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>

                      {/* 메시지 미리보기 */}
                      <p
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          color: isUnread ? "#1e293b" : "#64748b",
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
                            color: isUnread ? "#2563eb" : "#94a3b8",
                            fontWeight: isUnread ? "600" : "normal",
                          }}
                        >
                          {isUnread ? "안읽음" : "읽음"}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "12px",
                            color: msg.read_at ? "#64748b" : "#f59e0b",
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
