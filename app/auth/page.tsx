"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        "회원가입 요청이 완료되었습니다. 이메일 인증이 설정되어 있다면 이메일을 확인해 주세요."
      );
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      // 로그인 성공 시 세션 갱신 후 메인으로 이동
      router.push("/");
      router.refresh();
    }
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

          <label>
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
              minLength={6}
            />
          </label>

          <button type="submit">
            {isSignup ? "회원가입" : "로그인"}
          </button>
        </form>

        {message && <p className="auth-message">{message}</p>}

        <button
          type="button"
          className="switch-button"
          onClick={() => {
            setIsSignup(!isSignup);
            setMessage("");
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