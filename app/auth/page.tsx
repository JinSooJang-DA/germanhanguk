"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { GERMAN_REGIONS } from "@/lib/germanRegions";


export default function AuthPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [region, setRegion] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [isEmailConfirmationPending, setIsEmailConfirmationPending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "kakao" | null>(null);

  const googleAuthEnabled = true;
  const kakaoAuthEnabled = false;
  const socialAuthEnabled = googleAuthEnabled || kakaoAuthEnabled;

  function resetForm() {
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setDisplayName("");
    setRegion("");
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
      const providerName = provider === "google" ? "Google" : "\uce74\uce74\uc624";
      setMessage(`${providerName} \ub85c\uadf8\uc778\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.`);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (isSignup) {
      // 1. ë¹„ë°€ë²ˆí˜¸ í™•ì¸ ê²€ì¦
      if (password !== passwordConfirm) {
        setMessage("ë¹„ë°€ë²ˆí˜¸ê°€ ì¼ì¹˜í•˜ì§€ ì•ŠìŠµë‹ˆë‹¤.");
        return;
      }

      // 2. ë‹‰ë„¤ìž„ ìœ íš¨ì„± ê²€ì¦
      const trimmedDisplayName = displayName.trim();
      if (!trimmedDisplayName) {
        setMessage("ë‹‰ë„¤ìž„ì„ ìž…ë ¥í•´ ì£¼ì„¸ìš”.");
        return;
      }
      if (trimmedDisplayName.length < 2) {
        setMessage("ë‹‰ë„¤ìž„ì€ 2ìž ì´ìƒì´ì–´ì•¼ í•©ë‹ˆë‹¤.");
        return;
      }

      // 3. ê±°ì£¼ì§€ì—­ ì„ íƒ ê²€ì¦
      const trimmedRegion = region.trim();
      if (!trimmedRegion) {
        setMessage("ê±°ì£¼ì§€ì—­ì„ ì„ íƒí•˜ê±°ë‚˜ ìž…ë ¥í•´ ì£¼ì„¸ìš”.");
        return;
      }

      setLoading(true);

      const signupEmail = email.trim();
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password,
        options: {
          data: {
            display_name: trimmedDisplayName,
            region: trimmedRegion,
          },
        },
      });

      setLoading(false);

      if (error) {
        setMessage(error.message);
        return;
      }

      // 4. íšŒì›ê°€ìž… ì„±ê³µ ë¶„ê¸° ì²˜ë¦¬
      if (data?.session) {
        // ì´ë©”ì¼ ì¸ì¦ ì—†ì´ ì¦‰ì‹œ ì„¸ì…˜ì´ ë°œê¸‰ëœ ê²½ìš° -> ë§ˆì´íŽ˜ì´ì§€ë¡œ ì¦‰ì‹œ ì´ë™
        router.push("/profile");
        router.refresh();
      } else {
        // ì´ë©”ì¼ ì¸ì¦ì´ í•„ìš”í•œ ê²½ìš° (data.session === null) -> í¼ì„ ë‹«ê³  ê°€ìž… ì™„ë£Œ ì•ˆë‚´ í™”ë©´ í‘œì‹œ
        setRegisteredEmail(signupEmail);
        setIsEmailConfirmationPending(true);
      }
    } else {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      setLoading(false);

      if (error) {
        setMessage(error.message);
        return;
      }

      // ë¡œê·¸ì¸ ì„±ê³µ ì‹œ ì„¸ì…˜ ê°±ì‹  í›„ ë©”ì¸ìœ¼ë¡œ ì´ë™
      router.push("/");
      router.refresh();
    }
  }

  // ì´ë©”ì¼ ì¸ì¦ ëŒ€ê¸° í™”ë©´ (ê°€ìž… ì™„ë£Œ í™”ë©´)
  if (isEmailConfirmationPending) {
    return (
      <main className="auth-page">
        <div className="auth-box" style={{ textAlign: "center" }}>
          <h1>German Hanguk</h1>

          <div style={{ fontSize: "48px", margin: "16px 0 8px" }}>âœ‰ï¸</div>
          <h2>íšŒì›ê°€ìž… ì™„ë£Œ</h2>

          <p style={{ color: "#475569", lineHeight: "1.6", margin: "16px 0 28px", fontSize: "15px" }}>
            íšŒì›ê°€ìž…ì´ ì™„ë£Œë˜ì—ˆìŠµë‹ˆë‹¤.<br />
            <strong>{registeredEmail}</strong>ìœ¼ë¡œ ì „ì†¡ëœ ì¸ì¦ ë§í¬ë¥¼ í™•ì¸í•´ ì£¼ì„¸ìš”.<br />
            ì´ë©”ì¼ ì¸ì¦ì„ ì™„ë£Œí•˜ì‹  í›„ ë¡œê·¸ì¸í•˜ì‹¤ ìˆ˜ ìžˆìŠµë‹ˆë‹¤.
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
            ë¡œê·¸ì¸ í™”ë©´ìœ¼ë¡œ ì´ë™
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-box">
        <h1>German Hanguk</h1>

        <h2>{isSignup ? "íšŒì›ê°€ìž…" : "ë¡œê·¸ì¸"}</h2>

        {socialAuthEnabled && (
          <>
            <div className="auth-social-actions" aria-label="ì†Œì…œ ê³„ì •ìœ¼ë¡œ ê³„ì†í•˜ê¸°">
              {googleAuthEnabled && (
                <button type="button" className="auth-social-button auth-social-button--google" onClick={() => handleSocialLogin("google")} disabled={socialLoading !== null || loading}>
                  <span className="auth-social-icon" aria-hidden="true">G</span>
                  {socialLoading === "google" ? "Google ì—°ê²° ì¤‘..." : "Googleë¡œ ê³„ì†í•˜ê¸°"}
                </button>
              )}
              {kakaoAuthEnabled && (
                <button type="button" className="auth-social-button auth-social-button--kakao" onClick={() => handleSocialLogin("kakao")} disabled={socialLoading !== null || loading}>
                  <span className="auth-social-icon" aria-hidden="true">K</span>
                  {socialLoading === "kakao" ? "ì¹´ì¹´ì˜¤ ì—°ê²° ì¤‘..." : "ì¹´ì¹´ì˜¤ë¡œ ê³„ì†í•˜ê¸°"}
                </button>
              )}
            </div>
            <div className="auth-divider"><span>ë˜ëŠ” ì´ë©”ì¼ë¡œ</span></div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <label>
            ì´ë©”ì¼
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
            />
          </label>

          {isSignup && (
            <>
              <label>
                ë‹‰ë„¤ìž„ (ë³„ëª…)
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="ì»¤ë®¤ë‹ˆí‹°ì—ì„œ ì‚¬ìš©í•  ë‹‰ë„¤ìž„ (2ìž ì´ìƒ)"
                  required
                  minLength={2}
                  maxLength={30}
                />
              </label>

              <label>
                ê±°ì£¼ì§€ì—­
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  required
                  style={{
                    padding: "13px 14px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "15px",
                    background: "#fff",
                  }}
                >
                  <option value="">ê±°ì£¼ì§€ì—­ì„ ì„ íƒí•˜ì„¸ìš”</option>
                  {GERMAN_REGIONS.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <label>
            ë¹„ë°€ë²ˆí˜¸
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ë¹„ë°€ë²ˆí˜¸ (6ìž ì´ìƒ)"
              required
              minLength={6}
            />
          </label>

          {isSignup && (
            <label>
              ë¹„ë°€ë²ˆí˜¸ í™•ì¸
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="ë¹„ë°€ë²ˆí˜¸ ë‹¤ì‹œ ìž…ë ¥"
                required
                minLength={6}
              />
            </label>
          )}

          <button className="auth-primary-action" type="submit" disabled={loading}>
            {loading ? "ì²˜ë¦¬ ì¤‘..." : isSignup ? "íšŒì›ê°€ìž…" : "ë¡œê·¸ì¸"}
          </button>
        </form>

        {message && (
          <p
            className="auth-message"
            style={{
              color: message.includes("ì™„ë£Œ") ? "var(--gh-success)" : "var(--gh-alert)",
              fontWeight: 500,
            }}
          >
            {message}
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
            ? "ì´ë¯¸ ê³„ì •ì´ ìžˆìŠµë‹ˆë‹¤ â†’ ë¡œê·¸ì¸"
            : "ê³„ì •ì´ ì—†ìœ¼ì‹ ê°€ìš”? â†’ íšŒì›ê°€ìž…"}
        </button>
      </div>
    </main>
  );
}
