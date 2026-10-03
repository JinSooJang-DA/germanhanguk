"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { getServerUiLanguage, readHeaderUiLanguage, subscribeUiLanguage } from "@/lib/auth-locale";
import ThemeSelector from "@/components/ThemeSelector";
import BilingualButtonText from "@/components/BilingualButtonText";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isCommunityHome = pathname === "/" && (searchParams.get("section") === "community" || searchParams.get("category") !== null);
  const isCommunityRoute = pathname.startsWith("/posts") || isCommunityHome;
  const isKCultureRoute = pathname.startsWith("/k-culture");
  const isInfoRoute = (!isCommunityRoute && pathname === "/") || pathname.startsWith("/articles") || pathname.startsWith("/guide") || pathname.startsWith("/messe") || pathname.startsWith("/exchange");
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const storedUiLanguage = useSyncExternalStore(subscribeUiLanguage, readHeaderUiLanguage, getServerUiLanguage);
  const [preferredUiLanguage, setUiLanguage] = useState<"ko" | "de" | null>(null);
  const uiLanguage = preferredUiLanguage ?? storedUiLanguage;
  const isGermanUi = uiLanguage === "de";

  // 모바일 메뉴 서랍 열림 상태
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  async function loadUserProfile(userId: string, defaultEmail?: string) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, ui_language, role")
      .eq("id", userId)
      .single();

    setIsAdmin(profile?.role === "admin");
    setAvatarUrl(profile?.avatar_url || "");
    const preferredLanguage = profile?.ui_language === "de" ? "de" : "ko";
    setUiLanguage(preferredLanguage);
    window.localStorage.setItem("gh-ui-language", preferredLanguage);
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
    const handleLanguageChange = (event: Event) => {
      const language = (event as CustomEvent<string>).detail;
      if (language === "ko" || language === "de") setUiLanguage(language);
    };
    window.addEventListener("gh-language-changed", handleLanguageChange);
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
        setIsAdmin(false);
        setDisplayName("");
        setAvatarUrl("");
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
      window.removeEventListener("gh-language-changed", handleLanguageChange);
      window.removeEventListener("messages-updated", handleUpdateCount);
      window.removeEventListener("notifications-updated", handleUpdateNotifCount);
    };
  }, []);

  // Keep the notification badge fresh across tabs and devices.
  useEffect(function() {
    if (!user?.id) return;
    const userId = user.id;
    const refreshNotifications = function() { loadUnreadNotificationsCount(userId); };
    const channel = supabase
      .channel("header-notifications-" + userId)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: "recipient_id=eq." + userId }, refreshNotifications)
      .subscribe();
    const handleVisibility = function() {
      if (document.visibilityState === "visible") refreshNotifications();
    };
    window.addEventListener("focus", refreshNotifications);
    document.addEventListener("visibilitychange", handleVisibility);
    return function() {
      window.removeEventListener("focus", refreshNotifications);
      document.removeEventListener("visibilitychange", handleVisibility);
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // 열린 메뉴는 ESC 또는 메뉴 바깥 영역을 클릭하면 닫는다.
  useEffect(function() {
    const handleKeyDown = function(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setProfileMenuOpen(false);
      }
    };
    const handlePointerDown = function(e: PointerEvent) {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(".profile-menu-shell")) setProfileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return function() {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  // 반응형 모드에서 모바일 메뉴를 연 채 데스크톱 폭으로 전환하면
  // 남아 있는 백드롭/드로어가 화면을 가리지 않도록 자동으로 닫는다.
  useEffect(function() {
    const handleResize = function() {
      if (window.innerWidth >= 1180) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return function() {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(function() {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return function() { document.body.style.overflow = previousOverflow; };
  }, [menuOpen]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setDisplayName("");
    setAvatarUrl("");
    setIsAdmin(false);
    setUnreadCount(0);
    setUnreadNotificationsCount(0);
    setProfileMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <>
    <header className="site-header" style={{ borderBottom: "1px solid var(--gh-border)", background: "var(--gh-surface)", padding: "16px 0" }}>
      <div className="wrapper" style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px" }}>
        
        {/* ======================================================================
            1. 데스크톱 헤더 (769px 이상에서만 노출, 기존 디자인 및 동작 100% 동일 보장)
           ====================================================================== */}
        <div className="desktop-header">
          <Link className="desktop-logo brand-lockup" href="/" style={{ textDecoration: "none", color: "var(--gh-text)", marginRight: "24px" }}>
            <span className="brand-mark-shell brand-mark-desktop" aria-hidden="true"><Image className="brand-mark brand-mark-light" src="/assets/brand/germanhanguk-logo-m.png" alt="" width={38} height={38} priority /><Image className="brand-mark brand-mark-dark" src="/assets/brand/germanhanguk-logo-m-dark.png" alt="" width={38} height={38} priority /></span>
            <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>German Hanguk</h1>
          </Link>

          <div className="desktop-header-stage" aria-hidden="true" />
          {user ? (
            <div className="desktop-user-actions header-account-zone" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* 레퍼런스처럼 얇은 프레임 안에 아이콘만 두는 알림 컨트롤 */}
              <Link
                href="/notifications"
                className={"header-square-action" + (pathname === "/notifications" ? " is-active" : "")}
                aria-label="알림"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
                {unreadNotificationsCount > 0 && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--gh-alert)",
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
                    {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                  </span>
                )}
              </Link>

              {/* 쪽지도 동일한 정사각형 컨트롤 */}
              <Link
                href="/messages"
                className={"header-square-action" + (pathname.startsWith("/messages") ? " is-active" : "")}
                aria-label="쪽지"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3zM3 6l9 7 9-7" /></svg>
                {unreadCount > 0 && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--gh-alert)",
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

              <div className="profile-menu-shell" style={{ position: "relative" }}>
                <button
                  type="button"
                  className="header-profile-trigger"
                  onClick={function() { setProfileMenuOpen(!profileMenuOpen); }}
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                >
                  <span className="header-profile-name">{displayName || user.email?.split("@")[0]}{isGermanUi ? "" : "님"}</span>
                  <span className="header-avatar" aria-hidden="true">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" />
                    ) : (
                      <svg className="header-avatar-placeholder" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 22v-3a8 8 0 0 1 16 0v3" /></svg>
                    )}
                  </span>
                </button>

                {profileMenuOpen && (
                  <div
                    role="menu"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      zIndex: 1000,
                      width: "220px",
                      padding: "8px",
                      border: "1px solid var(--gh-border)",
                      borderRadius: "8px",
                      background: "var(--gh-surface)",
                      boxShadow: "0 8px 20px rgba(0, 0, 0, 0.12)",
                    }}
                  >
                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={function() { setProfileMenuOpen(false); }}
                      style={{
                        display: "block",
                        padding: "10px 12px",
                        textDecoration: "none",
                        color: "var(--gh-text)",
                        fontWeight: "600",
                        fontSize: "14px",
                      }}
                    >
                      {isGermanUi ? "Mein Profil" : "내 프로필"}
                    </Link>
                    {isAdmin && <Link href="/admin" role="menuitem" onClick={() => setProfileMenuOpen(false)} style={{ display: "block", padding: "10px 12px", color: "var(--gh-text)", fontWeight: 600 }}>{isGermanUi ? "Betriebszentrale" : "운영센터 / Admin"}</Link>}
                    <div style={{ borderTop: "1px solid var(--gh-border)", padding: "10px 0" }}>
                      <span style={{ display: "block", padding: "0 12px 6px", color: "var(--gh-text-muted)", fontSize: "12px", fontWeight: "600" }}>
                        {isGermanUi ? "Darstellung" : "화면 설정"}
                      </span>
                      <ThemeSelector />
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        cursor: "pointer",
                        border: "1px solid var(--gh-border)",
                        background: "var(--gh-surface-muted)",
                        borderRadius: "6px",
                        fontSize: "13px",
                        color: "var(--gh-text)",
                        textAlign: "left",
                      }}
                    >
                      <BilingualButtonText ko="로그아웃" de="Abmelden" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Link className="desktop-login" href="/auth">
                <button style={{ padding: "7px 15px", fontSize: "14px", fontWeight: 700, cursor: "pointer", background: "var(--gh-control-active)", color: "var(--gh-control-active-text)", border: "none", borderRadius: "4px" }}>
                  <BilingualButtonText ko="로그인" de="Anmelden" />
                </button>
              </Link>
              <ThemeSelector />
            </div>
          )}
        </div>

        {/* ======================================================================
            2. 모바일 헤더 (768px 이하 전용, 360px 기기 완벽 대응 컴팩트 구조)
           ====================================================================== */}
        <div className="mobile-header">
          <Link className="brand-lockup brand-lockup-mobile" href="/" style={{ textDecoration: "none", color: "var(--gh-text)" }}>
            <span className="brand-mark-shell brand-mark-mobile" aria-hidden="true"><Image className="brand-mark brand-mark-light" src="/assets/brand/germanhanguk-logo-m.png" alt="" width={32} height={32} priority /><Image className="brand-mark brand-mark-dark" src="/assets/brand/germanhanguk-logo-m-dark.png" alt="" width={32} height={32} priority /></span>
            <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, letterSpacing: "-0.02em" }}>German Hanguk</h1>
          </Link>

          {/* 알림 배지, 쪽지 배지, 햄버거 메뉴를 묶은 컨트롤 존 (최소 44px 클릭 영역) */}
          <div className="mobile-header-controls" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {user && (
              <>
                {/* 모바일 전용 알림 배지 */}
                <Link
                  href="/notifications"
                  className={"header-square-action mobile-header-action" + (pathname === "/notifications" ? " is-active" : "")}
                  aria-label={"알림 확인, 수신된 알림 " + unreadNotificationsCount + "개"}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
                  {unreadNotificationsCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "var(--gh-alert)",
                        color: "#ffffff",
                        fontSize: "9px",
                        fontWeight: "bold",
                        borderRadius: "50%",
                        height: "16px",
                        width: "16px",
                        boxSizing: "border-box",
                      }}
                    >
                      {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                    </span>
                  )}
                </Link>

                {/* 모바일 전용 쪽지 배지 */}
                <Link
                  href="/messages"
                  className={"header-square-action mobile-header-action" + (pathname.startsWith("/messages") ? " is-active" : "")}
                  aria-label={"쪽지함 이동, 안읽은 쪽지 " + unreadCount + "개"}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3zM3 6l9 7 9-7" /></svg>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "var(--gh-alert)",
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
              className="mobile-menu-trigger"
              onClick={function() { setMenuOpen(!menuOpen); }}
              aria-label="전체 메뉴 열기"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu-drawer"
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
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        </div>

        {/* ======================================================================
            3. 모바일 서랍식 드로어 슬라이드오버 (Backdrop 클릭, ESC 키 및 링크 클릭 이탈 완벽 연동)
           ====================================================================== */}
        {menuOpen && typeof document !== "undefined" && createPortal(
          <>
            {/* 회색 반투명 백드롭 */}
            <div
              onClick={function() { setMenuOpen(false); }}
              style={{
                position: "fixed",
                inset: "0 0 calc(64px + env(safe-area-inset-bottom)) 0",
                background: "rgba(15, 23, 42, 0.4)",
                backdropFilter: "blur(1px)",
                zIndex: 998,
              }}
            />

            {/* 본문 서랍 (Right-to-Left 슬라이드 구조) */}
            <div
              id="mobile-menu-drawer"
              className="mobile-menu-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="전체 메뉴"
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: "calc(64px + env(safe-area-inset-bottom))",
                width: "300px",
                background: "var(--gh-surface)",
                boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.15)",
                zIndex: 999,
                display: "flex",
                flexDirection: "column",
                padding: "16px",
                boxSizing: "border-box",
                overflowY: "auto",
              }}
            >
              {/* 서랍 헤더 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <span style={{ fontWeight: "bold", fontSize: "16px", color: "var(--gh-text)" }}>German Hanguk 메뉴 · Menü</span>
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
              <nav className="mobile-portal-nav" style={{ display: "flex", flexDirection: "column", gap: "18px", flex: 1 }}>
                <section className="mobile-menu-section">
                  <div className="mobile-menu-heading"><span>정보 · Info</span><small>뉴스와 독일 생활 가이드 · Nachrichten und Alltag in Deutschland</small></div>
                  <Link href="/articles" onClick={function() { setMenuOpen(false); }}>📰 독일 소식 · Deutschland-News</Link>
                  <Link href="/guide" onClick={function() { setMenuOpen(false); }}>📘 생활 가이드 · Alltagsguide</Link>
                  <Link href="/messe" onClick={function() { setMenuOpen(false); }}>🏢 독일 메세 · Messen</Link>
                  <div className="mobile-topic-links">
                    <Link href="/guide/visa-residence" onClick={function() { setMenuOpen(false); }}>비자·체류 · Visum</Link>
                    <Link href="/guide/taxes" onClick={function() { setMenuOpen(false); }}>세금 · Steuern</Link>
                    <Link href="/guide/jobs" onClick={function() { setMenuOpen(false); }}>노동·취업 · Arbeit</Link>
                    <Link href="/guide/insurance" onClick={function() { setMenuOpen(false); }}>건강·보험 · Gesundheit</Link>
                    <Link href="/guide/housing" onClick={function() { setMenuOpen(false); }}>주거 · Wohnen</Link>
                    <Link href="/guide/education" onClick={function() { setMenuOpen(false); }}>가족·교육 · Familie & Bildung</Link>
                    <Link href="/guide/driving" onClick={function() { setMenuOpen(false); }}>교통·운전 · Verkehr</Link>
                    <Link href="/guide/german-life" onClick={function() { setMenuOpen(false); }}>독일 생활 · Alltag</Link>
                  </div>
                </section>
                <section className="mobile-menu-section">
                  <div className="mobile-menu-heading"><span>커뮤니티 · Community</span><small>교민들의 질문과 경험 · Fragen, Erfahrungen und Austausch</small></div>
                  <Link href="/?section=community" onClick={function() { setMenuOpen(false); }}>커뮤니티 홈 · Community-Start</Link>
                  <Link href="/?section=community&category=community" onClick={function() { setMenuOpen(false); }}>자유게시판 · Freie Community</Link>
                  <Link href="/?section=community&category=education" onClick={function() { setMenuOpen(false); }}>유학·교육 · Studium & Bildung</Link>
                  <Link href="/?section=community&category=life" onClick={function() { setMenuOpen(false); }}>생활정보 · Alltag</Link>
                  <Link href="/?section=community&category=market" onClick={function() { setMenuOpen(false); }}>중고장터 · Marktplatz</Link>
                  <Link href="/?section=community&category=jobs" onClick={function() { setMenuOpen(false); }}>구인구직 · Jobs</Link>
                  <Link href="/?section=community&category=tandem" onClick={function() { setMenuOpen(false); }}>🇰🇷↔🇩🇪 탄뎀 · Tandem</Link>
                </section>
              </nav>

              <ThemeSelector mobile />

              {/* 드로어 하단 사용자 영역 */}
              <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid var(--gh-border)" }}>
                {user ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {isAdmin && <Link href="/admin" onClick={() => { setProfileMenuOpen(false); setMenuOpen(false); }}>{isGermanUi ? "Betriebszentrale" : "운영센터 / Admin"}</Link>}
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
                      <BilingualButtonText ko="로그아웃" de="Abmelden" />
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
                      <BilingualButtonText ko="로그인" de="Anmelden" />
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </>,
          document.body
        )}

      </div>
    </header>

    <nav className="service-switcher" aria-label="German Hanguk 서비스">
      <div className="service-switcher-inner">
        <Link href="/" className={isInfoRoute ? "is-active" : ""}>정보 · Info</Link>
        <Link href="/?section=community" className={isCommunityRoute ? "is-active" : ""}>커뮤니티 · Community</Link>
        <Link href="/k-culture" className={isKCultureRoute ? "is-active service-kculture" : "service-kculture"}>
          <span>K-Culture</span><small>Korea entdecken</small>
        </Link>
      </div>
    </nav>

      <nav className="mobile-bottom-nav" aria-label="모바일 빠른 메뉴">
        <Link href="/" className="mobile-bottom-nav-item" aria-label="홈으로 이동">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3z" /></svg>
          <span>{isGermanUi ? "Home" : "홈"}</span>
        </Link>
        <button type="button" className="mobile-bottom-nav-item" onClick={function() { window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="페이지 최상단으로 이동">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10l7-7 7 7M12 3v18" /></svg>
          <span>{isGermanUi ? "Nach oben" : "맨위"}</span>
        </button>
        <button type="button" className="mobile-bottom-nav-item" onClick={function() { setMenuOpen(function(open) { return !open; }); }} aria-label="전체 메뉴 열기" aria-expanded={menuOpen}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          <span>{isGermanUi ? "Menü" : "메뉴"}</span>
        </button>
        <Link href={user ? "/profile" : "/auth"} className="mobile-bottom-nav-item" aria-label={user ? "프로필로 이동" : "로그인으로 이동"}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" /></svg>
          <span>{user ? (isGermanUi ? "Profil" : "프로필") : (isGermanUi ? "Login" : "로그인")}</span>
        </Link>
      </nav>
    </>
  );
}
