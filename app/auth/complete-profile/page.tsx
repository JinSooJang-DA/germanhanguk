"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasCommunityIdentity, isValidCommunityName } from "@/lib/communityProfile";
import { GERMAN_REGIONS } from "@/lib/germanRegions";
import { supabase } from "@/lib/supabase";

import AuthLanguageSelector from "@/components/AuthLanguageSelector";
import { useAuthLocale, readUiLanguage, persistUiLanguage, formError, authCopy, AuthMessage } from "@/lib/auth-locale";

const copy = {
  ko: { title: "프로필 만들기", intro: "커뮤니티에서 사용할 닉네임을 먼저 정해주세요. 나머지 정보는 선택이며 언제든 나중에 수정할 수 있어요.", language: "화면 언어", name: "커뮤니티 닉네임 (필수)", nameHint: "커뮤니티에서 사용할 이름", region: "거주지역 (선택)", regionHint: "선택 안 함", nationality: "국적 / 배경", nationalityHint: "선택하세요", korean: "대한민국", german: "독일", other: "기타", private: "표시하지 않음", showNationality: "프로필에 국적을 공개합니다", native: "주로 사용하는 언어", learning: "배우고 싶은 언어", none: "선택 안 함", tandem: "탄뎀 찾는 중", tandemHint: "켜면 언어 정보가 탄뎀 프로필에 공개됩니다.", save: "German Hanguk 시작하기", saving: "저장 중...", loading: "프로필을 준비하고 있어요...", nameError: "닉네임은 2~30자로 입력해 주세요.", saveError: "프로필을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
  de: { title: "Profil erstellen", intro: "Lege zuerst deinen Community-Namen fest. Alle weiteren Angaben sind optional und können später geändert werden.", language: "Sprache der Oberfläche", name: "Community-Name (Pflichtfeld)", nameHint: "Dein Name in der Community", region: "Wohnort (optional)", regionHint: "Keine Auswahl", nationality: "Nationalität / Hintergrund", nationalityHint: "Bitte auswählen", korean: "Südkorea", german: "Deutschland", other: "Andere", private: "Nicht angeben", showNationality: "Nationalität im Profil anzeigen", native: "Meine Sprache", learning: "Ich lerne", none: "Keine Auswahl", tandem: "Ich suche Tandem", tandemHint: "Wenn aktiviert, werden deine Sprachangaben im Tandem-Profil sichtbar.", save: "German Hanguk starten", saving: "Wird gespeichert...", loading: "Profil wird vorbereitet...", nameError: "Der Community-Name muss 2 bis 30 Zeichen lang sein.", saveError: "Das Profil konnte nicht gespeichert werden. Bitte versuche es erneut." },
} as const;

const languageOptions = ["한국어 / Koreanisch", "Deutsch", "English", "기타 / Andere"];
const languageLabels = {
  ko: ["한국어", "독일어", "영어", "기타"],
  de: ["Koreanisch", "Deutsch", "Englisch", "Andere"],
};

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
  const [message, setMessage] = useState<"" | "nameError" | "saveError" | AuthMessage>("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const t = copy[uiLanguage];
  useEffect(() => {
    async function loadProfile() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) { router.replace("/auth"); return; }
      const [{ data: profile, error: profileError }, { data: details, error: detailsError }] = await Promise.all([
        supabase.from("profiles").select("display_name, region, ui_language, tandem_enabled, show_nationality").eq("id", user.id).maybeSingle(),
        supabase.from("profile_private_details").select("nationality, native_language, learning_language").eq("user_id", user.id).maybeSingle(),
      ]);
      if (profileError || detailsError || !profile) { setMessage("saveError"); setLoadFailed(true); setLoading(false); return; }
      if (hasCommunityIdentity(user, profile)) { router.replace("/"); return; }
      const metadataLanguage = user.user_metadata.ui_language;
      const preferred = metadataLanguage === "de" || metadataLanguage === "ko" ? metadataLanguage : readUiLanguage();
      chooseLanguage(preferred);
      // Incomplete accounts must deliberately choose their community nickname.
      setDisplayName("");
      setRegion(profile?.region || "");
      setTandemEnabled(profile?.tandem_enabled === true);
      setShowNationality(profile?.show_nationality === true);
      setNationality(details?.nationality || "");
      setNativeLanguage(details?.native_language || "");
      setLearningLanguage(details?.learning_language || "");
      setLoading(false);
    }
    loadProfile().catch(() => { setMessage("saveError"); setLoadFailed(true); setLoading(false); });
  }, [router, chooseLanguage]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = formError(event.currentTarget);
    if (validation) { setMessage(validation); return; }
    const name = displayName.trim();
    if (!isValidCommunityName(name)) { setMessage("nameError"); return; }
    setSaving(true); setMessage("");
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) { router.replace("/auth"); return; }
    // Pin incomplete status before writing a deliberate nickname, so a partial save
    // can never be mistaken for a completed legacy profile.
    const { error: pendingError } = await supabase.auth.updateUser({
      data: { community_profile_completed: false, ui_language: uiLanguage },
    });
    if (pendingError) { setSaving(false); setMessage("saveError"); return; }
    const { data: savedProfile, error: profileSaveError } = await supabase.from("profiles").update({
      display_name: name, region: region || null, ui_language: uiLanguage,
      tandem_enabled: tandemEnabled,
      show_nationality: showNationality && Boolean(nationality) && nationality !== "PRIVATE",
    }).eq("id", user.id).select("id").single();
    if (profileSaveError || !savedProfile) { setSaving(false); setMessage("saveError"); return; }
    const { error: detailsError } = await supabase.from("profile_private_details").upsert({
      user_id: user.id, nationality: nationality || null,
      native_language: nativeLanguage || null, learning_language: learningLanguage || null,
      updated_at: new Date().toISOString(),
    });
    if (detailsError) { setSaving(false); setMessage("saveError"); return; }
    const { error: completionError } = await supabase.auth.updateUser({
      data: { community_profile_completed: true, ui_language: uiLanguage },
    });
    setSaving(false);
    if (completionError) { setMessage("saveError"); return; }
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
          <label>{t.region}<select value={region} onChange={(e) => setRegion(e.target.value)}><option value="">{t.regionHint}</option>{GERMAN_REGIONS.map((city, index) => <option key={city} value={city}>{authCopy[uiLanguage].regionLabels[index]}</option>)}</select></label>
          <label>{t.nationality}<select value={nationality} onChange={(e) => setNationality(e.target.value)}><option value="">{t.nationalityHint}</option><option value="KR">{t.korean}</option><option value="DE">{t.german}</option><option value="OTHER">{t.other}</option><option value="PRIVATE">{t.private}</option></select></label>
          {nationality && nationality !== "PRIVATE" && <label className="auth-check-row"><input type="checkbox" checked={showNationality} onChange={(e) => setShowNationality(e.target.checked)} /> <span>{t.showNationality}</span></label>}
          <div className="profile-language-pair">
            <label>{t.native}<select value={nativeLanguage} onChange={(e) => setNativeLanguage(e.target.value)}><option value="">{t.none}</option>{languageOptions.map((language, index) => <option key={language} value={language}>{languageLabels[uiLanguage][index]}</option>)}</select></label>
            <label>{t.learning}<select value={learningLanguage} onChange={(e) => setLearningLanguage(e.target.value)}><option value="">{t.none}</option>{languageOptions.map((language, index) => <option key={language} value={language}>{languageLabels[uiLanguage][index]}</option>)}</select></label>
          </div>
          <label className="tandem-optin-row"><input type="checkbox" checked={tandemEnabled} onChange={(e) => setTandemEnabled(e.target.checked)} /><span><strong>🇰🇷 ↔ 🇩🇪 {t.tandem}</strong><small>{t.tandemHint}</small></span></label>
          <button className="auth-primary-action" type="submit" disabled={saving || loadFailed}>{saving ? t.saving : t.save}</button>
        </form>
        {message && <p className="auth-message" role="alert" style={{ color: "var(--gh-alert)", fontWeight: 500 }}>{message === "nameError" || message === "saveError" ? t[message] : authCopy[uiLanguage][message]}</p>}
      </div>
    </main>
  );
}
