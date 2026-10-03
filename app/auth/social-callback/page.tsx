"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthLanguageSelector from "@/components/AuthLanguageSelector";
import { useAuthLocale, authCopy } from "@/lib/auth-locale";
import { hasCommunityIdentity } from "@/lib/communityProfile";
import { supabase } from "@/lib/supabase";

export default function SocialCallbackPage() {
  const router = useRouter();
  const [uiLanguage, chooseLanguage] = useAuthLocale();
  const t = authCopy[uiLanguage];
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function finishSocialLogin() {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;

      if (error || !data.session?.user) {
        setFailed(true);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, region")
        .eq("id", data.session.user.id)
        .maybeSingle();

      if (cancelled) return;
      if (profileError) { setFailed(true); return; }
      const needsProfile = !hasCommunityIdentity(data.session.user, profile);
      router.replace(needsProfile ? "/auth/complete-profile" : "/");
      router.refresh();
    }

    finishSocialLogin().catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [router]);

  return (
    <main className="auth-page" lang={uiLanguage}>
      <div className="auth-box auth-status-box" role="status">
        <h1>German Hanguk</h1>
        <AuthLanguageSelector language={uiLanguage} onChange={chooseLanguage} />
        {!failed && <div className="auth-status-spinner" aria-hidden="true" />}
        <p>{failed ? t.callbackError : t.callbackLoading}</p>
      </div>
    </main>
  );
}
