"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GERMAN_REGIONS } from "@/lib/germanRegions";
import { supabase } from "@/lib/supabase";

import AuthLanguageSelector from "@/components/AuthLanguageSelector";
import { useAuthLocale, readUiLanguage, persistUiLanguage, formError, authCopy, AuthMessage } from "@/lib/auth-locale";

const copy = {
  ko: { title: "프로필 만들기", intro: "먼저 사용할 언어를 선택하고, 커뮤니티에서 보여줄 정보를 정해주세요.", language: "화면 언어", name: "닉네임 (별명)", nameHint: "커뮤니티에서 사용할 이름", region: "거주지역", regionHint: "거주지역을 선택하세요", nationality: "국적 / 배경", nationalityHint: "선택하세요", korean: "대한민국", german: "독일", other: "기타", private: "표시하지 않음", showNationality: "프로필에 국적을 공개합니다", native: "주로 사용하는 언어", learning: "배우고 싶은 언어", none: "선택 안 함", tandem: "탄뎀 찾는 중", tandemHint: "켜면 언어 정보가 탄뎀 프로필에 공개됩니다.", save: "German Hanguk 시작하기", saving: "저장 중...", loading: "프로필을 준비하고 있어요...", nameError: "닉네임은 2자 이상 입력해 주세요.", regionError: "거주지역을 선택해 주세요.", saveError: "프로필을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
  de: { title: "Profil erstellen", intro: "Wähle zuerst deine Sprache und entscheide dann, was andere in der Community sehen dürfen.", language: "Sprache der Oberfläche", name: "Anzeigename", nameHint: "Dein Name in der Community", region: "Wohnort", regionHint: "Wohnort auswählen", nationality: "Nationalität / Hintergrund", nationalityHint: "Bitte auswählen", korean: "Südkorea", german: "Deutschland", other: "Andere", private: "Nicht angeben", showNationality: "Nationalität im Profil anzeigen", native: "Meine Sprache", learning: "Ich lerne", none: "Keine Auswahl", tandem: "Ich suche Tandem", tandemHint: "Wenn aktiviert, werden deine Sprachangaben im Tandem-Profil sichtbar.", save: "German Hanguk starten", saving: "Wird gespeichert...", loading: "Profil wird vorbereitet...", nameError: "Der Anzeigename muss mindestens 2 Zeichen lang sein.", regionError: "Bitte wähle deinen Wohnort.", saveError: "Das Profil konnte nicht gespeichert werden. Bitte versuche es erneut." },
} as const;

const languageOptions = ["한국어 / Koreanisch", "Deutsch", "English", "기타 / Andere"];

export default function CompleteProfilePage() {
  const router = useRouter();
  const [uiLanguage, chooseLanguage] = useAuthLocale();
  const [displayName, setDisplayName] = useState("");
  const [region, setRegion] = useState("");
  const [nationality, setNationality] = useState("");
  const [showNationality, setShowNationality] = useState(false);
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [learningLanguage, setLearningLanguage] = useState("");
  const [tandemEnabled, setTandemEnabled] = useState(false);
  const [message, setMessage] = useState<"" | "nameError" | "regionError" | "saveError" | AuthMessage>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const t = copy[uiLanguage];
  useEffect(() => {
    async function loadProfile() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) { router.replace("/auth"); return; }
      const [{ data: profile }, { data: details }] = await Promise.all([
        supabase.from("profiles").select("display_name, region, ui_language, tandem_enabled, show_nationality").eq("id", user.id).maybeSingle(),
        supabase.from("profile_private_details").select("nationality, native_language, learning_language").eq("user_id", user.id).maybeSingle(),
      ]);
      // Incomplete social profiles have a default language; retain the pre-auth choice.
      const preferred = profile?.region?.trim() ? (profile.ui_language === "de" ? "de" : "ko") : readUiLanguage();
      chooseLanguage(preferred);
      setDisplayName(profile?.display_name || user.user_metadata?.full_name || "");
      setRegion(profile?.region || "");
      setTandemEnabled(profile?.tandem_enabled === true);
      setShowNationality(profile?.show_nationality === true);
      setNationality(details?.nationality || "");
      setNativeLanguage(details?.native_language || "");
      setLearningLanguage(details?.learning_language || "");
      setLoading(false);
    }
    loadProfile();
  }, [router, chooseLanguage]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = formError(event.currentTarget);
    if (validation) { setMessage(validation); return; }
    const name = displayName.trim();
    if (name.length < 2) { setMessage("nameError"); return; }
    if (!region) { setMessage("regionError"); return; }
    setSaving(true); setMessage("");
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) { router.replace("/auth"); return; }
    const { error } = await supabase.from("profiles").update({
      display_name: name, region, ui_language: uiLanguage,
      tandem_enabled: tandemEnabled, show_nationality: showNationality && Boolean(nationality),
    }).eq("id", user.id);
    if (!error) {
      const { error: detailsError } = await supabase.from("profile_private_details").upsert({
        user_id: user.id, nationality: nationality || null,
        native_language: nativeLanguage || null, learning_language: learningLanguage || null,
        updated_at: new Date().toISOString(),
      });
      if (detailsError) { setSaving(false); setMessage("saveError"); return; }
    }
    setSaving(false);
    if (error) { setMessage("saveError"); return; }
    persistUiLanguage(uiLanguage);
    router.replace("/profile"); router.refresh();
  }

  if (loading) return <main className="auth-page" lang={uiLanguage}><div className="auth-box auth-status-box"><h1>German Hanguk</h1><AuthLanguageSelector language={uiLanguage} onChange={chooseLanguage} /><p>{t.loading}</p></div></main>;

  return (
    <main className="auth-page" lang={uiLanguage}>
      <div className="auth-box profile-onboarding-box">
        <h1>German Hanguk</h1>
        <AuthLanguageSelector language={uiLanguage} onChange={chooseLanguage} />
        <h2>{t.title}</h2>
        <p className="auth-intro">{t.intro}</p>
        <form onSubmit={handleSubmit} noValidate>
          <label>{t.name}<input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t.nameHint} minLength={2} maxLength={30} required /></label>
          <label>{t.region}<select value={region} onChange={(e) => setRegion(e.target.value)} required><option value="">{t.regionHint}</option>{GERMAN_REGIONS.map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
          <label>{t.nationality}<select value={nationality} onChange={(e) => setNationality(e.target.value)}><option value="">{t.nationalityHint}</option><option value="KR">{t.korean}</option><option value="DE">{t.german}</option><option value="OTHER">{t.other}</option><option value="PRIVATE">{t.private}</option></select></label>
          {nationality && nationality !== "PRIVATE" && <label className="auth-check-row"><input type="checkbox" checked={showNationality} onChange={(e) => setShowNationality(e.target.checked)} /> <span>{t.showNationality}</span></label>}
          <div className="profile-language-pair">
            <label>{t.native}<select value={nativeLanguage} onChange={(e) => setNativeLanguage(e.target.value)}><option value="">{t.none}</option>{languageOptions.map((language) => <option key={language} value={language}>{language}</option>)}</select></label>
            <label>{t.learning}<select value={learningLanguage} onChange={(e) => setLearningLanguage(e.target.value)}><option value="">{t.none}</option>{languageOptions.map((language) => <option key={language} value={language}>{language}</option>)}</select></label>
          </div>
          <label className="tandem-optin-row"><input type="checkbox" checked={tandemEnabled} onChange={(e) => setTandemEnabled(e.target.checked)} /><span><strong>🇰🇷 ↔ 🇩🇪 {t.tandem}</strong><small>{t.tandemHint}</small></span></label>
          <button className="auth-primary-action" type="submit" disabled={saving}>{saving ? t.saving : t.save}</button>
        </form>
        {message && <p className="auth-message" role="alert" style={{ color: "var(--gh-alert)", fontWeight: 500 }}>{message === "nameError" || message === "regionError" || message === "saveError" ? t[message] : authCopy[uiLanguage][message]}</p>}
      </div>
    </main>
  );
}
