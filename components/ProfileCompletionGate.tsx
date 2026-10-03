"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { hasCommunityIdentity } from "@/lib/communityProfile";
import { supabase } from "@/lib/supabase";

type GateState = "checking" | "open" | "locked";

const PROFILE_SETUP_PATH = "/auth/complete-profile";

export default function ProfileCompletionGate({
  header,
  children,
  footer,
}: {
  header: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [gateState, setGateState] = useState<GateState>("checking");
  const isProfileSetup = pathname === PROFILE_SETUP_PATH;
  const isPublicLegal = ["/impressum", "/datenschutz", "/kontakt", "/nutzungsbedingungen"].includes(pathname);

  useEffect(() => {
    let cancelled = false;
    let authTimer: ReturnType<typeof setTimeout> | null = null;

    async function evaluate(session: Session | null) {
      if (cancelled) return;
      if (!session) {
        setGateState("open");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("display_name, region")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;

      const incomplete = Boolean(error) || !hasCommunityIdentity(session.user, profile);
      if (incomplete) {
        setGateState("locked");
        if (!isProfileSetup && !isPublicLegal) router.replace(PROFILE_SETUP_PATH);
        return;
      }
      setGateState("open");
    }

    void supabase.auth.getSession().then(({ data }) => evaluate(data.session));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (authTimer) clearTimeout(authTimer);
      authTimer = setTimeout(() => { void evaluate(session); }, 0);
    });

    return () => {
      cancelled = true;
      if (authTimer) clearTimeout(authTimer);
      authListener.subscription.unsubscribe();
    };
  }, [isProfileSetup, isPublicLegal, pathname, router]);

  // The profile step is intentionally isolated: no site navigation, footer, or
  // other clickable app surface exists until a deliberate nickname is saved.
  if (isProfileSetup) return <>{children}</>;

  if (gateState !== "open" && !isPublicLegal) {
    return (
      <main className="auth-page" aria-busy="true">
        <div className="auth-box auth-status-box">
          <h1>German Hanguk</h1>
          <p>{gateState === "locked" ? "프로필 설정을 완료해 주세요." : "계정을 확인하고 있어요..."}</p>
        </div>
      </main>
    );
  }

  return (
    <>
      {header}
      <div style={{ flex: 1 }}>{children}</div>
      {footer}
    </>
  );
}
