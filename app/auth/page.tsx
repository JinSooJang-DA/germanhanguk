"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const GERMAN_REGIONS = [
  "Berlin (베를린)",
  "Frankfurt am Main (프랑크푸르트)",
  "München (뮌헨)",
  "Düsseldorf (뒤셀도르프)",
  "Hamburg (함부르크)",
  "Köln (쾰른)",
  "Stuttgart (슈투트가르트)",
  "Münster (뮌스터)",
  "Nürnberg (뉘른베르크)",
  "Leipzig (라이프치히)",
  "Dresden (드레스덴)",
  "Bonn (본)",
  "기타 독일 지역",
];

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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (isSignup) {
      // 1. 비밀번호 확인 검증
      if (password !== passwordConfirm) {
        setMessage("비밀번호가 일치하지 않습니다.");
        return;
      }

      // 2. 닉네임 유효성 검증
      const trimmedDisplayName = displayName.trim();
      if (!trimmedDisplayName) {
        setMessage("닉네임을 입력해 주세요.");
        return;
      }
      if (trimmedDisplayName.length < 2) {
        setMessage("닉네임은 2자 이상이어야 합니다.");
        return;
      }

      // 3. 거주지역 선택 검증
      const trimmedRegion = region.trim();
      if (!trimmedRegion) {
        setMessage("거주지역을 선택하거나 입력해 주세요.");
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

      // 4. 회원가입 성공 분기 처리
      if (data?.session) {
        // 이메일 인증 없이 즉시 세션이 발급된 경우 -> 마이페이지로 즉시 이동
        router.push("/profile");
        router.refresh();
      } else {
        // 이메일 인증이 필요한 경우 (data.session === null) -> 폼을 닫고 가입 완료 안내 화면 표시
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

      // 로그인 성공 시 세션 갱신 후 메인으로 이동
      router.push("/");
      router.refresh();
    }
  }

  // 이메일 인증 대기 화면 (가입 완료 화면)
  if (isEmailConfirmationPending) {
    return (
      <main className="auth-page">
        <div className="auth-box" style={{ textAlign: "center" }}>
          <h1>German Hanguk</h1>

          <div style={{ fontSize: "48px", margin: "16px 0 8px" }}>✉️</div>
          <h2>회원가입 완료</h2>

          <p style={{ color: "#475569", lineHeight: "1.6", margin: "16px 0 28px", fontSize: "15px" }}>
            회원가입이 완료되었습니다.<br />
            <strong>{registeredEmail}</strong>으로 전송된 인증 링크를 확인해 주세요.<br />
            이메일 인증을 완료하신 후 로그인하실 수 있습니다.
          </p>

          <button
            type="button"
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
            로그인 화면으로 이동
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-box">
        <h1>German Hanguk</h1>

        <h2>{isSignup ? "회원가입" : "로그인"}</h2>

        <form onSubmit={handleSubmit}>
          <label>
            이메일
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
                닉네임 (별명)
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="커뮤니티에서 사용할 닉네임 (2자 이상)"
                  required
                  minLength={2}
                  maxLength={30}
                />
              </label>

              <label>
                거주지역
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
                  <option value="">거주지역을 선택하세요</option>
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
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 (6자 이상)"
              required
              minLength={6}
            />
          </label>

          {isSignup && (
            <label>
              비밀번호 확인
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호 다시 입력"
                required
                minLength={6}
              />
            </label>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "처리 중..." : isSignup ? "회원가입" : "로그인"}
          </button>
        </form>

        {message && (
          <p
            className="auth-message"
            style={{
              color: message.includes("완료") ? "#16a34a" : "#dc2626",
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
            ? "이미 계정이 있습니다 → 로그인"
            : "계정이 없으신가요? → 회원가입"}
        </button>
      </div>
    </main>
  );
}