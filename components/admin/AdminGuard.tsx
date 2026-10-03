"use client";
import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "allowed" | "denied">("checking");
  useEffect(() => {
    let alive = true;
    let revision = 0;
    async function check() {
      const current = ++revision;
      const { data } = await supabase.auth.getUser();
      const { data: profile } = data.user ? await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle() : { data: null };
      if (alive && current === revision) setState(profile?.role === "admin" ? "allowed" : "denied");
    }
    void check();
    const { data } = supabase.auth.onAuthStateChange(() => { revision++; setState("checking"); setTimeout(() => { if (alive) void check(); }, 0); });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);
  if (state === "checking") return <p role="status">관리자 권한을 확인하고 있습니다…</p>;
  if (state === "denied") return <div><h1>관리자 전용 페이지입니다.</h1><p>Nur für Administratoren.</p><Link href="/">메인으로 돌아가기</Link></div>;
  return children;
}
