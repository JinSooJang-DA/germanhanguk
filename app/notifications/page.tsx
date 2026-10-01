"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/date";

interface NotificationItem {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: "COMMENT" | "REPLY" | "POST_LIKE";
  reference_id: string;
  post_id: number;
  is_read: boolean;
  created_at: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  posts?: {
    title: string;
  } | null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [completedLoadKey, setCompletedLoadKey] = useState<number | null>(null);
  const loading = completedLoadKey !== reloadKey;

  useEffect(function() {
    let isCurrent = true;

    async function loadNotifications() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isCurrent) return;

        if (!session) {
          setNotifications([]);
          setCurrentUserId(null);
          setError(null);
          alert("로그인이 필요한 서비스입니다.");
          router.push("/auth");
          return;
        }

        setCurrentUserId(session.user.id);

        const { data, error: fetchErr } = await supabase
          .from("notifications")
          .select("id,recipient_id,actor_id,type,reference_id,post_id,is_read,created_at,profiles:actor_id(display_name,avatar_url),posts:post_id(title)")
          .order("created_at", { ascending: false });

        if (!isCurrent) return;

        if (fetchErr) {
          setError(fetchErr.message);
        } else {
          setError(null);
          setNotifications((data || []) as unknown as NotificationItem[]);
        }
      } catch (err: unknown) {
        if (isCurrent) {
          console.error("Auth fetch error:", err);
          setError("알림 목록을 불러오는 데 실패했습니다.");
        }
      } finally {
        if (isCurrent) {
          setCompletedLoadKey(reloadKey);
        }
      }
    }

    loadNotifications();

    return function() {
      isCurrent = false;
    };
  }, [reloadKey, router]);

  async function handleMarkAsRead(notifId: string) {
    try {
      const { error: patchErr } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notifId);

      if (patchErr) {
        console.error("Mark as read error:", patchErr);
        return;
      }

      setNotifications(function(prev) {
        return prev.map(function(n) {
          if (n.id === notifId) {
            return { ...n, is_read: true };
          }
          return n;
        });
      });

      window.dispatchEvent(new Event("notifications-updated"));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }

  async function handleMarkAllAsRead() {
    if (!currentUserId || notifications.length === 0) return;
    try {
      const { error: patchErr } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", currentUserId)
        .eq("is_read", false);

      if (patchErr) {
        alert("알림 전체 읽음 처리 실패: " + patchErr.message);
        return;
      }

      setNotifications(function(prev) {
        return prev.map(function(n) {
          return { ...n, is_read: true };
        });
      });
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  }

  function getNotificationMessage(item: NotificationItem) {
    const actorName = item.profiles?.display_name || "누군가";
    const postTitle = item.posts?.title ? '"' + item.posts.title + '"' : "게시물";

    if (item.type === "COMMENT") {
      return actorName + "님이 회원님의 게시글 " + postTitle + "에 댓글을 남겼습니다.";
    } else if (item.type === "REPLY") {
      return actorName + "님이 회원님의 댓글에 답글을 남겼습니다.";
    } else if (item.type === "POST_LIKE") {
      return actorName + "님이 회원님의 게시글 " + postTitle + "을 좋아합니다.";
    }
    return "새로운 알림이 도착했습니다.";
  }

  const hasUnread = notifications.some(function(n) {
    return !n.is_read;
  });

  if (loading) {
    return (
      <main style={{ padding: "80px 0", minHeight: "calc(100vh - 80px)" }}>
        <div className="wrapper" style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "var(--gh-text-muted)" }}>알림 목록을 불러오는 중...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: "80px 0", minHeight: "calc(100vh - 80px)" }}>
        <div className="wrapper" style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "var(--gh-alert)", marginBottom: "16px" }}>에러: {error}</p>
          <button
            onClick={function() {
              setReloadKey(function(previousKey) {
                return previousKey + 1;
              });
            }}
            style={{
              padding: "10px 20px",
              background: "var(--gh-text)",
              color: "var(--gh-surface)",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: "60px 0", minHeight: "calc(100vh - 80px)", background: "var(--gh-page-bg)" }}>
      <div className="wrapper" style={{ maxWidth: "600px", margin: "0 auto", padding: "0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "var(--gh-text)", margin: 0 }}>알림 내역</h1>
          {hasUnread && (
            <button
              onClick={handleMarkAllAsRead}
              style={{
                background: "none",
                border: "none",
                color: "var(--gh-accent)",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                padding: 0,
              }}
            >
              모두 읽음으로 표시
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div style={{
            background: "var(--gh-surface)",
            borderRadius: "12px",
            padding: "60px 20px",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            border: "1px solid var(--gh-border)"
          }}>
            <p style={{ fontSize: "36px", margin: "0 0 16px 0" }}>🔔</p>
            <p style={{ color: "var(--gh-text-muted)", margin: 0, fontSize: "15px" }}>아직 도착한 알림이 없습니다.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {notifications.map(function(item) {
              return (
                <div
                  key={item.id}
                  style={{
                    background: "var(--gh-surface)",
                    borderRadius: "12px",
                    padding: "16px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    border: "1px solid var(--gh-border)",
                    display: "flex",
                    gap: "14px",
                    alignItems: "flex-start",
                    opacity: item.is_read ? 0.7 : 1,
                    position: "relative",
                    transition: "all 0.2s"
                  }}
                >
                  {!item.is_read && (
                    <span style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "var(--gh-alert)",
                      position: "absolute",
                      top: "20px",
                      right: "20px"
                    }} />
                  )}

                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "var(--gh-surface-muted)",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    {item.profiles?.avatar_url ? (
                      <img
                        src={item.profiles.avatar_url}
                        alt={item.profiles?.display_name || "사용자"}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontSize: "18px" }}>👤</span>
                    )}
                  </div>

                  <div style={{ flex: 1, paddingRight: "16px" }}>
                    <p style={{
                      margin: "0 0 6px 0",
                      fontSize: "14px",
                      lineHeight: "1.5",
                      color: item.is_read ? "var(--gh-text-muted)" : "var(--gh-text)",
                      fontWeight: item.is_read ? "normal" : "500"
                    }}>
                      {getNotificationMessage(item)}
                    </p>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "var(--gh-text-subtle)" }}>
                        {formatDateTime(item.created_at)}
                      </span>
                      
                      <Link
                        href={"/posts/" + item.post_id + (item.type !== "POST_LIKE" ? "#comment-" + item.reference_id : "")}
                        onClick={handleMarkAsRead.bind(null, item.id)}
                        style={{
                          fontSize: "12px",
                          color: "var(--gh-accent)",
                          fontWeight: "600",
                          textDecoration: "none"
                        }}
                      >
                        이동하기 →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
