"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/date";
import styles from "./notifications.module.css";

type NotificationType = "COMMENT" | "REPLY" | "POST_LIKE";
type Filter = "all" | "unread";

interface NotificationItem {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: NotificationType;
  reference_id: string;
  post_id: number;
  is_read: boolean;
  created_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
  posts?: { title: string } | null;
}

const PAGE_SIZE = 20;
function getMessage(item: NotificationItem) {
  const actor = item.profiles?.display_name || "누군가";
  const title = item.posts?.title ? `“${item.posts.title}”` : "게시물";
  if (item.type === "COMMENT") return `${actor}님이 회원님의 게시글 ${title}에 댓글을 남겼습니다.`;
  if (item.type === "REPLY") return `${actor}님이 회원님의 댓글에 답글을 남겼습니다.`;
  return `${actor}님이 회원님의 게시글 ${title}을 좋아합니다.`;
}

function getKind(item: NotificationItem) {
  if (item.type === "COMMENT") return { icon: "💬", label: "댓글" };
  if (item.type === "REPLY") return { icon: "↩", label: "답글" };
  return { icon: "♥", label: "좋아요" };
}

function getHref(item: NotificationItem) {
  const anchor = item.type === "POST_LIKE" ? "" : `#comment-${item.reference_id}`;
  return `/posts/${item.post_id}${anchor}`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(function() {
    let active = true;
    supabase.auth.getUser().then(function({ data }) {
      if (!active) return;
      if (!data.user) {
        router.replace("/auth");
        return;
      }
      setUserId(data.user.id);
    });
    return function() { active = false; };
  }, [router]);

  const loadNotifications = useCallback(async function() {
    if (!userId) return;
    setLoading(true);
    setError(null);
    let query = supabase.from("notifications")
      .select("id,recipient_id,actor_id,type,reference_id,post_id,is_read,created_at,profiles:actor_id(display_name,avatar_url),posts:post_id(title)")
      .order("created_at", { ascending: false })
      .range(0, limit);
    if (filter === "unread") query = query.eq("is_read", false);
    const [listResult, countResult] = await Promise.all([
      query,
      supabase.from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("is_read", false),
    ]);
    if (listResult.error) {
      setError(listResult.error.message);
      setLoading(false);
      return;
    }
    const rows = (listResult.data || []) as unknown as NotificationItem[];
    setItems(rows.slice(0, limit));
    setHasMore(rows.length > limit);
    if (!countResult.error) setUnreadCount(countResult.count || 0);
    setLoading(false);
  }, [filter, limit, userId]);

  useEffect(function() {
    const timer = window.setTimeout(function() { void loadNotifications(); }, 0);
    return function() { window.clearTimeout(timer); };
  }, [loadNotifications, refreshKey]);

  useEffect(function() {
    if (!userId) return;
    const channel = supabase.channel("notification-center-" + userId)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: "recipient_id=eq." + userId }, function() {
        setRefreshKey(function(value) { return value + 1; });
        window.dispatchEvent(new Event("notifications-updated"));
      })
      .subscribe();
    return function() { void supabase.removeChannel(channel); };
  }, [userId]);

  async function markAsRead(item: NotificationItem) {
    if (item.is_read || !userId) return;
    setItems(function(current) {
      return current.map(function(row) { return row.id === item.id ? { ...row, is_read: true } : row; });
    });
    setUnreadCount(function(count) { return Math.max(0, count - 1); });
    const { error: updateError } = await supabase.from("notifications")
      .update({ is_read: true })
      .eq("id", item.id)
      .eq("recipient_id", userId);
    if (updateError) {
      setRefreshKey(function(value) { return value + 1; });
      return;
    }
    window.dispatchEvent(new Event("notifications-updated"));
  }

  async function markAllAsRead() {
    if (!userId || unreadCount === 0) return;
    const { error: updateError } = await supabase.from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", userId)
      .eq("is_read", false);
    if (updateError) {
      setError("알림을 읽음 처리하지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setUnreadCount(0);
    setItems(function(current) { return filter === "unread" ? [] : current.map(function(row) { return { ...row, is_read: true }; }); });
    window.dispatchEvent(new Event("notifications-updated"));
  }

  function changeFilter(next: Filter) {
    setFilter(next);
    setLimit(PAGE_SIZE);
  }

  if (!userId || (loading && items.length === 0)) {
    return <main className={styles.page}><div className={styles.container}><div className={styles.state}>알림을 불러오는 중...</div></div></main>;
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>알림</h1>
            <p className={styles.subtitle}>댓글, 답글, 좋아요 소식을 확인하세요.</p>
          </div>
          {unreadCount > 0 && <button className={styles.markAll} onClick={function() { void markAllAsRead(); }}>모두 읽음</button>}
        </div>
        <div className={styles.tabs} role="tablist" aria-label="알림 필터">
          <button className={`${styles.tab} ${filter === "all" ? styles.tabActive : ""}`} onClick={function() { changeFilter("all"); }}>
            전체
          </button>
          <button className={`${styles.tab} ${filter === "unread" ? styles.tabActive : ""}`} onClick={function() { changeFilter("unread"); }}>
            안 읽음 {unreadCount > 0 ? unreadCount : ""}
          </button>
        </div>

        {error && (
          <div className={`${styles.state} ${styles.error}`}>
            <div>{error}</div>
            <button className={`${styles.loadMore} ${styles.retry}`} onClick={function() { setRefreshKey(function(v) { return v + 1; }); }}>다시 시도</button>
          </div>
        )}

        {!error && items.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🔔</span>
            {filter === "unread" ? "읽지 않은 알림이 없습니다." : "아직 도착한 알림이 없습니다."}
          </div>
        )}

        {!error && items.length > 0 && <div className={styles.list}>
          {items.map(function(item) {
            const kind = getKind(item);
            return (
              <Link
                key={item.id}
                href={getHref(item)}
                className={`${styles.card} ${!item.is_read ? styles.unread : ""}`}
                onClick={function() { void markAsRead(item); }}
              >
                {!item.is_read && <span className={styles.dot} aria-label="읽지 않음" />}
                {item.profiles?.avatar_url ? (
                  <span className={styles.avatar} style={{ backgroundImage: `url(${item.profiles.avatar_url})` }} aria-hidden="true" />
                ) : (
                  <span className={styles.avatarFallback} aria-hidden="true">👤</span>
                )}
                <div className={styles.body}>
                  <p className={styles.message}>{getMessage(item)}</p>
                  <div className={styles.meta}>{formatDateTime(item.created_at)}</div>
                </div>
                <span className={styles.kind}><span aria-hidden="true">{kind.icon}</span>{kind.label}</span>
              </Link>
            );
          })}
        </div>}

        {!error && hasMore && (
          <button className={styles.loadMore} onClick={function() { setLimit(function(value) { return value + PAGE_SIZE; }); }} disabled={loading}>
            {loading ? "불러오는 중..." : "알림 더 보기"}
          </button>
        )}
      </div>
    </main>
  );
}
