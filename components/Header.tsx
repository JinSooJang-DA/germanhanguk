"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import ThemeSelector from "@/components/ThemeSelector";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // 모바일 메뉴 서랍 열림 상태
  const [menuOpen, setMenuOpen] = useState(false);

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

  // 모바일 메뉴 서랍 ESC 키로 닫기 핸들러 연동 (Strict Mode 정리 대응)
  useEffect(function() {
    const handleKeyDown = function(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return function() {
      window.removeEventListener("keydown", handleKeyDown);
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
    <header style={{ borderBottom: "1px solid var(--gh-border)", background: "var(--gh-surface)", padding: "16px 0" }}>
      <div className="wrapper" style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px" }}>
        
        {/* ======================================================================
            1. 데스크톱 헤더 (769px 이상에서만 노출, 기존 디자인 및 동작 100% 동일 보장)
           ====================================================================== */}
        <div className="desktop-header">
          <Link href="/" style={{ textDecoration: "none", color: "var(--gh-text)", marginRight: "24px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>German Hanguk</h1>
          </Link>

          <nav style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap", marginRight: "auto" }}>
            <Link href="/?category=community" style={{ textDecoration: "none", color: "#475569", fontWeight: "500" }}>커뮤니티</Link>
            <Link href="/?category=education" style={{ textDecoration: "none", color: "#475569", fontWeight: "500" }}>유학·교육</Link>
            <Link href="/?category=life" style={{ textDecoration: "none", color: "#475569", fontWeight: "500" }}>생활정보</Link>
            <Link href="/?category=market" style={{ textDecoration: "none", color: "#475569", fontWeight: "500" }}>중고장터</Link>
            <Link href="/?category=jobs" style={{ textDecoration: "none", color: "#475569", fontWeight: "500" }}>구인구직</Link>
            <Link
              href="/guide"
              style={{
                textDecoration: "none",
                color: pathname.startsWith("/guide") ? "#0f172a" : "#475569",
                fontWeight: pathname.startsWith("/guide") ? "700" : "500",
              }}
            >
              생활 가이드
            </Link>
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

          <ThemeSelector />

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

        {/* ======================================================================
            2. 모바일 헤더 (768px 이하 전용, 360px 기기 완벽 대응 컴팩트 구조)
           ====================================================================== */}
        <div className="mobile-header">
          <Link href="/" style={{ textDecoration: "none", color: "var(--gh-text)" }}>
            <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, letterSpacing: "-0.02em" }}>German Hanguk</h1>
          </Link>

          {/* 알림 배지, 쪽지 배지, 햄버거 메뉴를 묶은 컨트롤 존 (최소 44px 클릭 영역) */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {user && (
              <>
                {/* 모바일 전용 알림 배지 */}
                <Link
                  href="/notifications"
                  aria-label={"알림 확인, 수신된 알림 " + unreadNotificationsCount + "개"}
                  style={{
                    textDecoration: "none",
                    color: "var(--gh-text)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "44px",
                    height: "44px",
                    position: "relative",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>🔔</span>
                  {unreadNotificationsCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#ef4444",
                        color: "#ffffff",
                        fontSize: "9px",
                        fontWeight: "bold",
                        borderRadius: "50%",
                        height: "16px",
                        width: "16px",
                        boxSizing: "border-box",
                      }}
                    >
                      {unreadNotificationsCount}
                    </span>
                  )}
                </Link>

                {/* 모바일 전용 쪽지 배지 */}
                <Link
                  href="/messages"
                  aria-label={"쪽지함 이동, 안읽은 쪽지 " + unreadCount + "개"}
                  style={{
                    textDecoration: "none",
                    color: "var(--gh-text)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "44px",
                    height: "44px",
                    position: "relative",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>✉️</span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#ef4444",
                        color: "#ffffff",
                        fontSize: "9px",
                        fontWeight: "bold",
                        borderRadius: "50%",
                        height: "16px",
                        width: "16px",
                        boxSizing: "border-box",
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            {/* 햄버거 메뉴 트리거 */}
            <button
              onClick={function() { setMenuOpen(!menuOpen); }}
              aria-label="전체 메뉴 열기"
              aria-expanded={menuOpen}
              style={{
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                padding: 0,
                width: "44px",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--gh-text)"
              }}
            >
              ☰
            </button>
          </div>
        </div>

        {/* ======================================================================
            3. 모바일 서랍식 드로어 슬라이드오버 (Backdrop 클릭, ESC 키 및 링크 클릭 이탈 완벽 연동)
           ====================================================================== */}
        {menuOpen && (
          <>
            {/* 회색 반투명 백드롭 */}
            <div
              onClick={function() { setMenuOpen(false); }}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.4)",
                backdropFilter: "blur(1px)",
                zIndex: 998,
              }}
            />

            {/* 본문 서랍 (Right-to-Left 슬라이드 구조) */}
            <div
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                width: "280px",
                background: "var(--gh-surface)",
                boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.15)",
                zIndex: 999,
                display: "flex",
                flexDirection: "column",
                padding: "24px",
                boxSizing: "border-box",
                overflowY: "auto",
              }}
            >
              {/* 서랍 헤더 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                <span style={{ fontWeight: "bold", fontSize: "16px", color: "var(--gh-text)" }}>GermanHanguk 메뉴</span>
                <button
                  onClick={function() { setMenuOpen(false); }}
                  aria-label="메뉴 닫기"
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "24px",
                    cursor: "pointer",
                    width: "44px",
                    height: "44px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    color: "var(--gh-text-muted)"
                  }}
                >
                  ✕
                </button>
              </div>

              {/* 드로어 내비게이션 리스트 (최소 44px 높이 터치 타겟) */}
              <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                <Link href="/?category=community" onClick={function() { setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "var(--gh-text)", fontWeight: "500", minHeight: "44px", borderBottom: "1px solid var(--gh-border)", fontSize: "14px" }}>커뮤니티</Link>
                <Link href="/?category=education" onClick={function() { setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "var(--gh-text)", fontWeight: "500", minHeight: "44px", borderBottom: "1px solid var(--gh-border)", fontSize: "14px" }}>유학·교육</Link>
                <Link href="/?category=life" onClick={function() { setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "var(--gh-text)", fontWeight: "500", minHeight: "44px", borderBottom: "1px solid var(--gh-border)", fontSize: "14px" }}>생활정보</Link>
                <Link href="/?category=market" onClick={function() { setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "var(--gh-text)", fontWeight: "500", minHeight: "44px", borderBottom: "1px solid var(--gh-border)", fontSize: "14px" }}>중고장터</Link>
                <Link href="/?category=jobs" onClick={function() { setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "var(--gh-text)", fontWeight: "500", minHeight: "44px", borderBottom: "1px solid var(--gh-border)", fontSize: "14px" }}>구인구직</Link>
                <Link href="/guide" onClick={function() { setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "var(--gh-accent)", fontWeight: "bold", minHeight: "44px", borderBottom: "1px solid var(--gh-border)", fontSize: "14px" }}>📘 생활 가이드</Link>
                <Link href="/map" onClick={function() { setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "var(--gh-text)", fontWeight: "500", minHeight: "44px", borderBottom: "1px solid var(--gh-border)", fontSize: "14px" }}>📍 K-Spot 지도</Link>
              </nav>

              <ThemeSelector mobile />

              {/* 드로어 하단 사용자 영역 */}
              <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid var(--gh-border)" }}>
                {user ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <Link href="/profile" onClick={function() { setMenuOpen(false); }} style={{ textDecoration: "none", color: "var(--gh-text)", fontWeight: "bold", display: "flex", alignItems: "center", minHeight: "44px", fontSize: "14px" }}>
                      👤 {displayName || user.email?.split("@")[0]}님 프로필
                    </Link>
                    <button
                      onClick={function() { handleLogout(); setMenuOpen(false); }}
                      style={{
                        width: "100%",
                        padding: "12px",
                        background: "var(--gh-surface-muted)",
                        border: "1px solid var(--gh-border)",
                        borderRadius: "6px",
                        color: "var(--gh-text)",
                        fontWeight: "bold",
                        cursor: "pointer",
                        minHeight: "44px",
                        fontSize: "13px"
                      }}
                    >
                      로그아웃
                    </button>
                  </div>
                ) : (
                  <Link href="/auth" onClick={function() { setMenuOpen(false); }} style={{ textDecoration: "none" }}>
                    <button
                      style={{
                        width: "100%",
                        padding: "12px",
                        background: "var(--gh-control-active)",
                        color: "var(--gh-control-active-text)",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        minHeight: "44px",
                        fontSize: "14px"
                      }}
                    >
                      로그인
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </header>
  );
}
