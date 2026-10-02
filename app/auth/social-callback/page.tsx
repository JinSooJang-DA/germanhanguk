"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SocialCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("로그인 정보를 확인하고 있어요...");

  useEffect(() => {
    let cancelled = false;

    async function finishSocialLogin() {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;

      if (error || !data.session?.user) {
        setMessage("로그인 정보를 확인하지 못했습니다. 다시 시도해 주세요.");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, region")
        .eq("id", data.session.user.id)
        .maybeSingle();

      if (cancelled) return;
      const needsProfile = !profile?.display_name?.trim() || !profile?.region?.trim();
      router.replace(needsProfile ? "/auth/complete-profile" : "/");
      router.refresh();
    }

    finishSocialLogin();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <main className="auth-page">
      <div className="auth-box auth-status-box" role="status">
        <h1>German Hanguk</h1>
        <div className="auth-status-spinner" aria-hidden="true" />
        <p>{message}</p>
      </div>
    </main>
  );
}
