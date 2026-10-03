"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuthLocale } from "@/lib/auth-locale";

export default function ContactForm() {
  const [language, chooseLanguage] = useAuthLocale();
  const de = language === "de";
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"success" | "error" | "rate" | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true); setResult(null);
    try {
      const { error } = await supabase.rpc("submit_contact_request", {
        p_email: String(fields.get("email") ?? "").trim(),
        p_subject: String(fields.get("subject") ?? "").trim(),
        p_message: String(fields.get("message") ?? "").trim(),
        p_language: language,
        p_website: String(fields.get("website") ?? ""),
      });
      if (error) setResult(error.message.includes("contact_rate_limit") ? "rate" : "error");
      else { setResult("success"); form.reset(); }
    } catch { setResult("error"); }
    finally { setBusy(false); }
  }
  return <section lang={language}><div className="auth-language-selector"><button type="button" aria-pressed={!de} onClick={() => chooseLanguage("ko")}>한국어</button><button type="button" aria-pressed={de} onClick={() => chooseLanguage("de")}>Deutsch</button></div><form className="contact-form" onSubmit={submit}>
    <label>{de ? "E-Mail für die Antwort" : "답변 받을 이메일"}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    <label>{de ? "Betreff" : "제목"}<input name="subject" required minLength={2} maxLength={160} /></label>
    <label>{de ? "Nachricht" : "문의 내용"}<textarea name="message" required minLength={10} maxLength={5000} rows={8} /></label>
    <div className="contact-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <p>{de ? "Ihre E-Mail, Nachricht und Sprache werden zur Bearbeitung gespeichert. Der Empfang ist keine Zusage einer Antwortfrist." : "이메일, 문의 내용과 언어를 문의 처리 목적으로 저장합니다. 접수는 답변 기한을 보장하지 않습니다."} <Link href="/datenschutz">{de ? "Datenschutz" : "개인정보 안내"}</Link></p>
    <button type="submit" disabled={busy}>{busy ? (de ? "Wird gesendet…" : "전송 중…") : (de ? "Nachricht senden" : "문의 보내기")}</button>
    <p role="status" aria-live="polite">{result === "success" ? (de ? "Ihre Nachricht wurde gespeichert." : "문의가 접수되었습니다.") : result === "rate" ? (de ? "Zu viele Anfragen. Bitte versuchen Sie es später erneut." : "문의가 너무 많습니다. 나중에 다시 시도해 주세요.") : result === "error" ? (de ? "Senden fehlgeschlagen. Bitte prüfen Sie die Angaben und versuchen Sie es erneut." : "전송에 실패했습니다. 입력 내용을 확인하고 다시 시도해 주세요.") : ""}</p>
  </form></section>;
}
