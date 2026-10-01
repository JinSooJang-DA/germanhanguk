"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface AuthorActionMenuProps {
  authorId: string;
  authorName: string;
  avatarUrl?: string | null;
  showAvatar?: boolean;
}

export default function AuthorActionMenu({ authorId, authorName, avatarUrl, showAvatar = true }: AuthorActionMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  async function ensureCurrentUser() {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id || "";
    setCurrentUserId(userId);
    return userId;
  }

  async function toggleMenu() {
    if (!open && currentUserId === null) await ensureCurrentUser();
    setOpen((value) => !value);
  }

  async function startMessage() {
    const userId = currentUserId === null ? await ensureCurrentUser() : currentUserId;
    setOpen(false);
    if (!userId) {
      router.push("/auth");
      return;
    }
    if (userId === authorId) return;
    setMessageBody("");
    setSendError("");
    setComposeOpen(true);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const body = messageBody.trim();
    if (!body || sending) return;
    if (body.length > 2000) {
      setSendError("쪽지는 최대 2000자까지 작성할 수 있습니다.");
      return;
    }
    const userId = currentUserId || await ensureCurrentUser();
    if (!userId) {
      router.push("/auth");
      return;
    }
    setSending(true);
    setSendError("");
    const { error } = await supabase.from("messages").insert({ sender_id: userId, receiver_id: authorId, body });
    setSending(false);
    if (error) {
      console.error("Message send error:", error);
      setSendError("쪽지를 보내지 못했습니다. 다시 시도해 주세요.");
      return;
    }
    setComposeOpen(false);
    setMessageBody("");
    window.dispatchEvent(new Event("messages-updated"));
  }

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        if (!sending) setComposeOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [sending]);

  const isOwnProfile = currentUserId === authorId;

  return (
    <>
      <div className={"author-action-menu" + (open ? " is-open" : "")} ref={rootRef}>
        <button type="button" className="author-action-trigger" onClick={toggleMenu} aria-expanded={open} aria-haspopup="menu" aria-label={`${authorName} 사용자 메뉴`}>
          {showAvatar && <span className="author-action-avatar" aria-hidden="true">{avatarUrl ? <img src={avatarUrl} alt="" /> : <span>👤</span>}</span>}
          <span className="author-action-name">{authorName}</span>
          <span className="author-action-chevron" aria-hidden="true">⌄</span>
        </button>
        {open && (
          <div className="author-action-popover" role="menu">
            {!isOwnProfile && <button type="button" role="menuitem" onClick={startMessage}><span aria-hidden="true">✉</span><span>쪽지 보내기</span></button>}
            <Link href={`/profile/${authorId}`} role="menuitem" onClick={() => setOpen(false)}><span aria-hidden="true">👤</span><span>{isOwnProfile ? "내 프로필" : "프로필 보기"}</span></Link>
            <Link href={`/profile/${authorId}#user-posts`} role="menuitem" onClick={() => setOpen(false)}><span aria-hidden="true">▤</span><span>작성글 보기</span></Link>
          </div>
        )}
      </div>

      {composeOpen && (
        <div className="author-message-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !sending) setComposeOpen(false); }}>
          <form className="author-message-dialog" onSubmit={sendMessage} aria-label={`${authorName}님에게 쪽지 보내기`}>
            <div className="author-message-heading">
              <div><strong>{authorName}</strong>님에게 쪽지 보내기</div>
              <button type="button" onClick={() => setComposeOpen(false)} disabled={sending} aria-label="닫기">×</button>
            </div>
            <textarea autoFocus value={messageBody} onChange={(event) => setMessageBody(event.target.value)} maxLength={2000} rows={6} placeholder="쪽지 내용을 입력하세요." disabled={sending} />
            <div className="author-message-meta"><span className="author-message-error">{sendError}</span><span>{messageBody.length}/2000</span></div>
            <div className="author-message-actions">
              <button type="button" onClick={() => setComposeOpen(false)} disabled={sending}>취소</button>
              <button type="submit" className="is-primary" disabled={sending || !messageBody.trim()}>{sending ? "보내는 중..." : "보내기"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}