"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"success" | "error" | "rate" | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true); setResult(null);
    try {
      const { error } = await supabase.rpc("submit_contact", {
        p_category: String(fields.get("category") ?? "general"),
        p_name: String(fields.get("name") ?? "").trim(),
        p_email: String(fields.get("email") ?? "").trim(),
        p_subject: String(fields.get("subject") ?? "").trim(),
        p_message: String(fields.get("message") ?? "").trim(),
        p_privacy_ack: fields.get("privacy") === "on",
        p_website: String(fields.get("website") ?? ""),
      });
      if (error) setResult(error.message.includes("contact_rate_limit") ? "rate" : "error");
      else { setResult("success"); form.reset(); }
    } catch { setResult("error"); }
    finally { setBusy(false); }
  }
  return <section><form className="contact-form" onSubmit={submit}>
    <label>문의 유형<select name="category" defaultValue="general"><option value="general">일반 문의</option><option value="content">콘텐츠 또는 신고</option><option value="privacy">개인정보</option><option value="technical">기술 문의</option></select></label>
    <label>이름 (선택)<input name="name" autoComplete="name" maxLength={100} /></label>
    <label>답변 받을 이메일<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    <label>제목<input name="subject" required minLength={2} maxLength={160} /></label>
    <label>문의 내용<textarea name="message" required minLength={10} maxLength={5000} rows={8} /></label>
    <div className="contact-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="contact-privacy"><input name="privacy" type="checkbox" required /> 개인정보 처리 안내를 읽었습니다.</label>
    <p>이메일, 문의 내용 및 선택한 유형은 문의 처리 목적으로 저장됩니다. 접수는 답변 기한을 보장하지 않습니다. <Link href="/datenschutz">개인정보 처리 안내</Link></p>
    <button type="submit" disabled={busy}>{busy ? "전송 중…" : "문의 보내기"}</button>
    <p role="status" aria-live="polite">{result === "success" ? "문의가 접수되었습니다." : result === "rate" ? "문의가 너무 많습니다. 나중에 다시 시도해 주세요." : result === "error" ? "전송에 실패했습니다. 입력 내용을 확인하고 다시 시도해 주세요." : ""}</p>
  </form></section>;
}
