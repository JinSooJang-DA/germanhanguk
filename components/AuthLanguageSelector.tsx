"use client";
import { UiLanguage } from "@/lib/auth-locale";
export default function AuthLanguageSelector({ language, onChange }: { language: UiLanguage; onChange: (language: UiLanguage) => void }) {
  return <div className="auth-language-selector" role="group" aria-label={language === "de" ? "Sprache wählen" : "언어 선택"}>
    <button type="button" lang="ko" aria-pressed={language === "ko"} onClick={() => onChange("ko")}>🇰🇷 한국어</button>
    <button type="button" lang="de" aria-pressed={language === "de"} onClick={() => onChange("de")}>🇩🇪 Deutsch</button>
  </div>;
}
