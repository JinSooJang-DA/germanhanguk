"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  async function loadUserProfile(userId: string, defaultEmail?: string) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    } else if (defaultEmail) {
      setDisplayName(defaultEmail.split("@")[0]);
    }
  }

  async function loadUnreadCount(userId: string) {
    try {
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .is("read_at", null);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    } catch (err) {
      console.error("Unread count fetch error:", err);
    }
  }

  async function loadUnreadNotificationsCount(userId: string) {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("is_read", false);

      if (!error && count !== null) {
        setUnreadNotificationsCount(count);
      }
    } catch (err) {
      console.error("Unread notifications count fetch error:", err);
    }
  }

  useEffect(function() {
    supabase.auth.getSession().then(function(res) {
      const session = res.data.session;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadUserProfile(currentUser.id, currentUser.email);
        loadUnreadCount(currentUser.id);
        loadUnreadNotificationsCount(currentUser.id);
      }
    });

    const resChange = supabase.auth.onAuthStateChange(function(_event, session) {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadUserProfile(currentUser.id, currentUser.email);
        loadUnreadCount(currentUser.id);
        loadUnreadNotificationsCount(currentUser.id);
      } else {
        setDisplayName("");
        setUnreadCount(0);
        setUnreadNotificationsCount(0);
      }
    });
    const subscription = resChange.data.subscription;

    const handleUpdateCount = function() {
      supabase.auth.getSession().then(function(res) {
        if (res.data.session?.user) {
          loadUnreadCount(res.data.session.user.id);
        }
      });
    };

    const handleUpdateNotifCount = function() {
      supabase.auth.getSession().then(function(res) {
        if (res.data.session?.user) {
          loadUnreadNotificationsCount(res.data.session.user.id);
        }
      });
    };

    window.addEventListener("messages-updated", handleUpdateCount);
    window.addEventListener("notifications-updated", handleUpdateNotifCount);

    return function() {
      subscription.unsubscribe();
      window.removeEventListener("messages-updated", handleUpdateCount);
      window.removeEventListener("notifications-updated", handleUpdateNotifCount);
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setDisplayName("");
    setUnreadCount(0);
    setUnreadNotificationsCount(0);
    router.push("/");
    router.refresh();
  }

  return (
    <header style={{ borderBottom: "1px solid #e2e8f0", background: "#fff", padding: "16px 0" }}>
      <div className="wrapper" style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px" }}>
        <Link href="/" style={{ textDecoration: "none", color: "#0f172a" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>German Hanguk</h1>
        </Link>

        <nav style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/?category=community" style={{ textDecoration: "none", color: "#475569", fontWeight: "500" }}>커뮤니티</Link>
          <Link href="/?category=education" style={{ textDecoration: "none", color: "#475569", fontWeight: "500" }}>유학·교육</Link>
          <Link href="/?category=life" style={{ textDecoration: "none", color: "#475569", fontWeight: "500" }}>생활정보</Link>
          <Link href="/?category=market" style={{ textDecoration: "none", color: "#475569", fontWeight: "500" }}>중고장터</Link>
          <Link href="/?category=jobs" style={{ textDecoration: "none", color: "#475569", fontWeight: "500" }}>구인구직</Link>
          <Link
            href="/map"
            style={{
              textDecoration: "none",
              color: pathname === "/map" ? "#0f172a" : "#475569",
              fontWeight: pathname === "/map" ? "700" : "500",
            }}
          >
            K-Spot 지도
          </Link>
        </nav>

        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* 알림 배지 */}
            <Link
              href="/notifications"
              style={{
                textDecoration: "none",
                color: pathname === "/notifications" ? "#0f172a" : "#475569",
                fontWeight: pathname === "/notifications" ? "700" : "500",
                fontSize: "14px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              🔔 알림
              {unreadNotificationsCount > 0 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#ef4444",
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: "bold",
                    borderRadius: "9999px",
                    height: "18px",
                    minWidth: "18px",
                    padding: "0 5px",
                    boxSizing: "border-box",
                  }}
                >
                  {unreadNotificationsCount}
                </span>
              )}
            </Link>

            {/* 쪽지 배지 */}
            <Link
              href="/messages"
              style={{
                textDecoration: "none",
                color: pathname.startsWith("/messages") ? "#0f172a" : "#475569",
                fontWeight: pathname.startsWith("/messages") ? "700" : "500",
                fontSize: "14px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              ✉️ 쪽지
              {unreadCount > 0 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#ef4444",
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: "bold",
                    borderRadius: "9999px",
                    height: "18px",
                    minWidth: "18px",
                    padding: "0 5px",
                    boxSizing: "border-box",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </Link>

            <Link
              href="/profile"
              style={{
                textDecoration: "none",
                color: "#0f172a",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              {displayName || user.email?.split("@")[0]}님
            </Link>
            <button 
              onClick={handleLogout} 
              style={{ 
                padding: "6px 12px", 
                cursor: "pointer", 
                border: "1px solid #cbd5e1", 
                background: "#fff", 
                borderRadius: "4px",
                fontSize: "13px",
                color: "#334155"
              }}
            >
              로그아웃
            </button>
          </div>
        ) : (
          <Link href="/auth">
            <button style={{ padding: "6px 14px", cursor: "pointer", background: "#0f172a", color: "#fff", border: "none", borderRadius: "4px" }}>
              로그인
            </button>
          </Link>
        )}
      </div>
    </header>
  );
}
