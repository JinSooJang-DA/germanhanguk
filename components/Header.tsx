"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string>("");

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadUserProfile(currentUser.id, currentUser.email);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadUserProfile(currentUser.id, currentUser.email);
      } else {
        setDisplayName("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setDisplayName("");
    router.push("/");
    router.refresh();
  }

  return (
    <header style={{ borderBottom: "1px solid #e2e8f0", background: "#fff", padding: "16px 0" }}>
      <div className="wrapper" style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px" }}>
        <Link href="/" style={{ textDecoration: "none", color: "#0f172a" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>German Hanguk</h1>
        </Link>

        <nav style={{ display: "flex", gap: "24px" }}>
          <Link href="/?category=community" style={{ textDecoration: "none", color: "#475569", fontWeight: "500" }}>커뮤니티</Link>
          <Link href="/?category=education" style={{ textDecoration: "none", color: "#475569", fontWeight: "500" }}>유학·교육</Link> {/* 👈 유학·교육 메뉴 추가 */}
          <Link href="/?category=life" style={{ textDecoration: "none", color: "#475569", fontWeight: "500" }}>생활정보</Link>
          <Link href="/?category=market" style={{ textDecoration: "none", color: "#475569", fontWeight: "500" }}>중고장터</Link>
          <Link href="/?category=jobs" style={{ textDecoration: "none", color: "#475569", fontWeight: "500" }}>구인구직</Link>
          <Link href="/?category=events" style={{ textDecoration: "none", color: "#475569", fontWeight: "500" }}>행사</Link>
        </nav>

        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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