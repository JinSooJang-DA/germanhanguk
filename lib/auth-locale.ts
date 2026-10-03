"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { GERMAN_REGIONS } from "@/lib/germanRegions";

export type UiLanguage = "ko" | "de";
export function readUiLanguage(): UiLanguage {
  // Retain the auth choice when Header loads a default social profile language.
  try {
    const language = window.sessionStorage.getItem("gh-auth-language");
    if (language === "ko" || language === "de") return language;
  } catch { /* Storage may be unavailable. */ }
  try { return window.localStorage.getItem("gh-ui-language") === "de" ? "de" : "ko"; }
  catch { return "ko"; }
}
export function persistUiLanguage(language: UiLanguage) {
  try { window.sessionStorage.setItem("gh-auth-language", language); } catch { /* Storage may be unavailable. */ }
  try { window.localStorage.setItem("gh-ui-language", language); } catch { /* Storage may be unavailable. */ }
  window.dispatchEvent(new CustomEvent("gh-language-changed", { detail: language }));
}
// A stable server snapshot keeps the initial client render consistent with SSR.
export function getServerUiLanguage(): UiLanguage { return "ko"; }
export function readHeaderUiLanguage(): UiLanguage {
  try { return window.localStorage.getItem("gh-ui-language") === "de" ? "de" : "ko"; }
  catch { return "ko"; }
}
export function subscribeUiLanguage(onChange: () => void) {
  window.addEventListener("gh-language-changed", onChange);
  return () => window.removeEventListener("gh-language-changed", onChange);
}
export function useAuthLocale() {
  const storedLanguage = useSyncExternalStore(subscribeUiLanguage, readUiLanguage, getServerUiLanguage);
  const [chosenLanguage, setLanguage] = useState<UiLanguage | null>(null);
  const language = chosenLanguage ?? storedLanguage;
  useEffect(() => {
    persistUiLanguage(readUiLanguage());
    // Keep explicit choices working even when browser storage is unavailable.
    const sync = (event: Event) => {
      const value = (event as CustomEvent).detail;
      if (value === "ko" || value === "de") setLanguage(value);
    };
    window.addEventListener("gh-language-changed", sync);
    return () => window.removeEventListener("gh-language-changed", sync);
  }, []);
  const chooseLanguage = useCallback((value: UiLanguage) => { setLanguage(value); persistUiLanguage(value); }, []);
  return [language, chooseLanguage] as const;
}

export const authCopy = {
  "ko": {
    "login": "로그인",
    "signup": "회원가입",
    "google": "Google로 계속하기",
    "googleLoading": "Google 연결 중...",
    "kakao": "카카오로 계속하기",
    "kakaoLoading": "카카오 연결 중...",
    "social": "소셜 계정으로 계속하기",
    "divider": "또는 이메일로",
    "email": "이메일",
    "name": "닉네임 (별명)",
    "nameHint": "커뮤니티에서 사용할 닉네임 (2자 이상)",
    "region": "거주지역",
    "regionHint": "거주지역을 선택하세요",
    "regionLabels": GERMAN_REGIONS,
    "password": "비밀번호",
    "passwordHint": "비밀번호 (6자 이상)",
    "confirm": "비밀번호 확인",
    "confirmHint": "비밀번호 다시 입력",
    "loading": "처리 중...",
    "toLogin": "이미 계정이 있습니다 → 로그인",
    "toSignup": "계정이 없으신가요? → 회원가입",
    "confirmed": "회원가입 완료",
    "confirmedIntro": "회원가입이 완료되었습니다.",
    "confirmedEmail": "이 주소로 전송된 인증 링크를 확인해 주세요.",
    "confirmedHelp": "이메일 인증을 완료하신 후 로그인하실 수 있습니다.",
    "backLogin": "로그인 화면으로 이동",
    "mismatch": "비밀번호가 일치하지 않습니다.",
    "nameRequired": "닉네임을 입력해 주세요.",
    "nameShort": "닉네임은 2자 이상이어야 합니다.",
    "regionRequired": "거주지역을 선택하거나 입력해 주세요.",
    "required": "필수 항목을 모두 입력해 주세요.",
    "emailInvalid": "올바른 이메일 주소를 입력해 주세요.",
    "passwordShort": "비밀번호는 6자 이상이어야 합니다.",
    "invalid": "입력한 내용을 확인해 주세요.",
    "credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "unconfirmed": "이메일 인증을 먼저 완료해 주세요.",
    "rateLimit": "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    "registered": "이미 등록된 이메일입니다. 로그인해 주세요.",
    "authError": "인증 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    "socialError": "소셜 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    "callbackLoading": "로그인 정보를 확인하고 있어요...",
    "callbackError": "로그인 정보를 확인하지 못했습니다. 다시 시도해 주세요."
  },
  "de": {
    "login": "Anmelden",
    "signup": "Registrieren",
    "google": "Mit Google fortfahren",
    "googleLoading": "Google wird verbunden...",
    "kakao": "Mit Kakao fortfahren",
    "kakaoLoading": "Kakao wird verbunden...",
    "social": "Mit einem sozialen Konto fortfahren",
    "divider": "oder mit E-Mail",
    "email": "E-Mail",
    "name": "Anzeigename",
    "nameHint": "Name in der Community (mind. 2 Zeichen)",
    "region": "Wohnort",
    "regionHint": "Wohnort auswählen",
    "regionLabels": GERMAN_REGIONS.map((city) => city === "기타 독일 지역" ? "Andere Region in Deutschland" : city.split(" (")[0]),
    "password": "Passwort",
    "passwordHint": "Passwort (mind. 6 Zeichen)",
    "confirm": "Passwort bestätigen",
    "confirmHint": "Passwort erneut eingeben",
    "loading": "Bitte warten...",
    "toLogin": "Schon registriert? → Anmelden",
    "toSignup": "Noch kein Konto? → Registrieren",
    "confirmed": "Registrierung abgeschlossen",
    "confirmedIntro": "Deine Registrierung ist abgeschlossen.",
    "confirmedEmail": "Bitte öffne den Bestätigungslink in der E-Mail an diese Adresse.",
    "confirmedHelp": "Nach der E-Mail-Bestätigung kannst du dich anmelden.",
    "backLogin": "Zur Anmeldung",
    "mismatch": "Die Passwörter stimmen nicht überein.",
    "nameRequired": "Bitte gib einen Anzeigenamen ein.",
    "nameShort": "Der Anzeigename muss mindestens 2 Zeichen lang sein.",
    "regionRequired": "Bitte wähle deinen Wohnort.",
    "required": "Bitte fülle alle Pflichtfelder aus.",
    "emailInvalid": "Bitte gib eine gültige E-Mail-Adresse ein.",
    "passwordShort": "Das Passwort muss mindestens 6 Zeichen lang sein.",
    "invalid": "Bitte überprüfe deine Eingaben.",
    "credentials": "E-Mail oder Passwort ist ungültig.",
    "unconfirmed": "Bitte bestätige zuerst deine E-Mail-Adresse.",
    "rateLimit": "Zu viele Anfragen. Bitte versuche es später erneut.",
    "registered": "Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an.",
    "authError": "Die Authentifizierung ist fehlgeschlagen. Bitte versuche es später erneut.",
    "socialError": "Die Anmeldung über das soziale Konto ist fehlgeschlagen. Bitte versuche es erneut.",
    "callbackLoading": "Deine Anmeldung wird überprüft...",
    "callbackError": "Deine Anmeldung konnte nicht bestätigt werden. Bitte versuche es erneut."
  }
} as const;
export type AuthMessage = Exclude<keyof typeof authCopy.ko, "regionLabels">;
export function authErrorKey(error: { code?: string }): AuthMessage {
  switch (error.code) {
    case "invalid_credentials": return "credentials";
    case "email_not_confirmed": return "unconfirmed";
    case "user_already_exists": case "email_exists": return "registered";
    case "weak_password": return "passwordShort";
    case "over_email_send_rate_limit": case "over_request_rate_limit": return "rateLimit";
    default: return "authError";
  }
}
export function formError(form: HTMLFormElement): AuthMessage | null {
  for (const element of Array.from(form.elements)) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) continue;
    if (element instanceof HTMLInputElement && element.value && element.minLength > 0 && element.value.length < element.minLength) {
      element.focus();
      return element.type === "password" ? "passwordShort" : "nameShort";
    }
    if (element.validity.valid) continue;
    element.focus();
    if (element.validity.valueMissing) return "required";
    if (element.validity.typeMismatch) return "emailInvalid";
    if (element instanceof HTMLInputElement && element.value.length < element.minLength)
      return element.type === "password" ? "passwordShort" : "nameShort";
    return "invalid";
  }
  return null;
}
