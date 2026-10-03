"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { WITHDRAWAL_CONFIRMATION, WithdrawalMode } from "@/lib/withdrawal";

export default function MemberWithdrawal() {
  const [mode, setMode] = useState<WithdrawalMode | "">("");
  const [confirmation, setConfirmation] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function withdraw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !mode || !accepted || confirmation !== WITHDRAWAL_CONFIRMATION) return;
    setBusy(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("로그인이 필요합니다. / Bitte anmelden.");
      const response = await fetch("/api/account/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ mode, confirmation }),
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error("로그인 세션이 만료되었습니다. 다시 로그인해 주세요. / Deine Sitzung ist abgelaufen. Bitte erneut anmelden.");
        throw new Error("탈퇴 처리에 실패했습니다. 다시 시도해 주세요. / Austritt fehlgeschlagen. Bitte erneut versuchen.");
      }
      await supabase.auth.signOut({ scope: "local" });
      window.localStorage.removeItem("gh-ui-language");
      window.location.replace("/auth?withdrawn=1");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "탈퇴 실패 / Austritt fehlgeschlagen");
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="withdrawal-title" className="member-withdrawal">
      <h1 id="withdrawal-title">회원 탈퇴 / Mitgliedschaft beenden</h1>
      <p>탈퇴하면 계정, 프로필, 비공개 정보, 좋아요, 알림, 평판 데이터가 영구 삭제됩니다. 복구할 수 없습니다.</p>
      <p lang="de">Dein Konto, Profil, private Angaben, Likes, Benachrichtigungen und Reputationsdaten werden endgültig gelöscht. Dies lässt sich nicht rückgängig machen.</p>
      <p>상대방의 쪽지 기록과 다른 회원의 답글은 유지되며 내 프로필 연결은 제거됩니다.</p>
      <p lang="de">Der Nachrichtenverlauf der anderen Person und Antworten anderer Mitglieder bleiben erhalten. Die Verknüpfung zu deinem Profil wird entfernt.</p>
      <form onSubmit={withdraw} className="post-form">
        <fieldset disabled={busy} style={{ display: "grid", gap: 16 }}>
          <legend>내 공개 글·댓글 처리 / Meine öffentlichen Beiträge und Kommentare</legend>
          <label><input type="radio" name="withdrawal-mode" value="preserve" checked={mode === "preserve"} onChange={() => setMode("preserve")} required /> 익명으로 유지: 탈퇴한 회원 표시로 글·댓글과 첨부 이미지를 보존합니다. 본문에 적은 개인정보도 남습니다.<br /><span lang="de">Anonym erhalten: Texte und angehängte Bilder bleiben unter „Ehemaliges Mitglied“ sichtbar. Persönliche Angaben im Text bleiben ebenfalls sichtbar.</span></label>
          <label><input type="radio" name="withdrawal-mode" value="remove" checked={mode === "remove"} onChange={() => setMode("remove")} required /> 내 내용 삭제: 글 제목·본문·댓글·첨부 이미지를 제거하고 삭제 안내를 남깁니다. 다른 회원의 답글은 유지됩니다.<br /><span lang="de">Meine Inhalte entfernen: Titel, Texte, Kommentare und angehängte Bilder werden durch Löschhinweise ersetzt. Antworten anderer Mitglieder bleiben erhalten.</span></label>
          <label><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required /> 영구 삭제와 선택한 처리 방식에 동의합니다. / Ich bestätige die endgültige Löschung und meine Auswahl.</label>
          <label htmlFor="withdrawal-confirmation">확인을 위해 {WITHDRAWAL_CONFIRMATION}을 대소문자 그대로 입력하세요. / Zur Bestätigung exakt {WITHDRAWAL_CONFIRMATION} eingeben (Groß-/Kleinschreibung beachten).</label>
          <input id="withdrawal-confirmation" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} required pattern={WITHDRAWAL_CONFIRMATION} />
          <button type="submit" className="submit-btn" disabled={!mode || !accepted || confirmation !== WITHDRAWAL_CONFIRMATION || busy} style={{ background: "var(--gh-alert)" }}>
            {busy ? "처리 중… / Wird bearbeitet…" : "영구 탈퇴 / Endgültig austreten"}
          </button>
        </fieldset>
        {error && <p role="alert" style={{ color: "var(--gh-alert)" }}>{error}</p>}
      </form>
    </section>
  );
}
