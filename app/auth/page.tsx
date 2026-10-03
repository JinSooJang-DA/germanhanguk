"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AuthLanguageSelector from "@/components/AuthLanguageSelector";
import { useAuthLocale, authCopy, authErrorKey, formError, AuthMessage } from "@/lib/auth-locale";
import { hasCommunityIdentity } from "@/lib/communityProfile";


export default function AuthPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [uiLanguage, chooseLanguage] = useAuthLocale();
  const t = authCopy[uiLanguage];
  const [isEmailConfirmationPending, setIsEmailConfirmationPending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [message, setMessage] = useState<AuthMessage | "">("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "kakao" | null>(null);

  const googleAuthEnabled = true;
  const kakaoAuthEnabled = false;
  const socialAuthEnabled = googleAuthEnabled || kakaoAuthEnabled;

  function resetForm() {
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setMessage("");
    setIsEmailConfirmationPending(false);
    setRegisteredEmail("");
  }

  async function handleSocialLogin(provider: "google" | "kakao") {
    setMessage("");
    setSocialLoading(provider);

    const redirectTo = `${window.location.origin}/auth/social-callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (error) {
      setSocialLoading(null);
      setMessage("socialError");
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const validation = formError(e.currentTarget);
    if (validation) { setMessage(validation); return; }

    if (isSignup) {
      // 1. 비밀번호 확인 검증
      if (password !== passwordConfirm) {
        setMessage("mismatch");
        return;
      }

      setLoading(true);

      const signupEmail = email.trim();
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/social-callback`,
          data: {
            community_profile_completed: false,
            ui_language: uiLanguage,
          },
        },
      });

      setLoading(false);

      if (error) {
        setMessage(authErrorKey(error));
        return;
      }

      // 4. 회원가입 성공 분기 처리
      if (data?.session) {
        // 이메일 인증 없이 즉시 세션이 발급된 경우 -> 마이페이지로 즉시 이동
        router.replace("/auth/complete-profile");
        router.refresh();
      } else {
        // 이메일 인증이 필요한 경우 (data.session === null) -> 폼을 닫고 가입 완료 안내 화면 표시
        setRegisteredEmail(signupEmail);
        setIsEmailConfirmationPending(true);
      }
    } else {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      setLoading(false);

      if (error) {
        setMessage(authErrorKey(error));
        return;
      }

      // Route unfinished accounts back to the required community-name step.
      const { data: profile, error: profileError } = await supabase.from("profiles")
        .select("display_name, region").eq("id", data.user.id).maybeSingle();
      if (profileError) { setMessage("authError"); return; }
      router.replace(hasCommunityIdentity(data.user, profile) ? "/" : "/auth/complete-profile");
      router.refresh();
    }
  }

  // 이메일 인증 대기 화면 (가입 완료 화면)
  if (isEmailConfirmationPending) {
    return (
      <main className="auth-page" lang={uiLanguage}>
        <div className="auth-box" style={{ textAlign: "center" }}>
          <h1>German Hanguk</h1>
          <AuthLanguageSelector language={uiLanguage} onChange={chooseLanguage} />

          <div style={{ fontSize: "48px", margin: "16px 0 8px" }}>✉️</div>
          <h2>{t.confirmed}</h2>

          <p style={{ color: "var(--gh-text-muted)", lineHeight: "1.6", margin: "16px 0 28px", fontSize: "15px" }}>
            {t.confirmedIntro}<br />
            <strong>{registeredEmail}</strong><br />{t.confirmedEmail}<br />
            {t.confirmedHelp}
          </p>

          <button
            type="button"
            className="auth-primary-action"
            onClick={() => {
              setIsEmailConfirmationPending(false);
              setIsSignup(false);
              resetForm();
            }}
            style={{
              width: "100%",
              padding: "14px",
              border: 0,
              borderRadius: "6px",
              background: "#0f172a",
              color: "white",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {t.backLogin}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page" lang={uiLanguage}>
      <div className="auth-box">
        <h1>German Hanguk</h1>

        <AuthLanguageSelector language={uiLanguage} onChange={chooseLanguage} />
        <h2>{isSignup ? t.signup : t.login}</h2>

        {socialAuthEnabled && (
          <>
            <div className="auth-social-actions" aria-label={t.social}>
              {googleAuthEnabled && (
                <button type="button" className="auth-social-button auth-social-button--google" onClick={() => handleSocialLogin("google")} disabled={socialLoading !== null || loading}>
                  <span className="auth-social-icon" aria-hidden="true">G</span>
                  {socialLoading === "google" ? t.googleLoading : t.google}
                </button>
              )}
              {kakaoAuthEnabled && (
                <button type="button" className="auth-social-button auth-social-button--kakao" onClick={() => handleSocialLogin("kakao")} disabled={socialLoading !== null || loading}>
                  <span className="auth-social-icon" aria-hidden="true">K</span>
                  {socialLoading === "kakao" ? t.kakaoLoading : t.kakao}
                </button>
              )}
            </div>
            <div className="auth-divider"><span>{t.divider}</span></div>
          </>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <label>
            {t.email}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
            />
          </label>


          <label>
            {t.password}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordHint}
              required
              minLength={6}
            />
          </label>

          {isSignup && (
            <label>
              {t.confirm}
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder={t.confirmHint}
                required
                minLength={6}
              />
            </label>
          )}

          <button className="auth-primary-action" type="submit" disabled={loading}>
            {loading ? t.loading : isSignup ? t.signup : t.login}
          </button>
        </form>

        {message && (
          <p
            className="auth-message" role="alert"
            style={{
              color: "var(--gh-alert)",
              fontWeight: 500,
            }}
          >
            {t[message]}
          </p>
        )}

        <button
          type="button"
          className="switch-button"
          onClick={() => {
            setIsSignup(!isSignup);
            resetForm();
          }}
        >
          {isSignup
            ? t.toLogin
            : t.toSignup}
        </button>
      </div>
    </main>
  );
}
