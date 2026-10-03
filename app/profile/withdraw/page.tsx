"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MemberWithdrawal from "@/components/MemberWithdrawal";
import { supabase } from "@/lib/supabase";

export default function WithdrawalPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) router.replace("/auth");
      else setReady(true);
    });
    return () => { active = false; };
  }, [router]);

  return (
    <main className="withdrawal-page">
      <Link href="/profile" className="back-link">← 프로필로 돌아가기 / Zurück zum Profil</Link>
      {ready ? <MemberWithdrawal /> : <p role="status">계정을 확인하고 있어요… / Konto wird geprüft…</p>}
    </main>
  );
}
