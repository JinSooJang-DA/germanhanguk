"use client";

import { Dispatch, FormEvent, SetStateAction, useState } from "react";

const EMOJIS = [
  "😀", "😄", "😂", "🤣", "😊", "😍", "🥰", "😘", "😎", "🤩",
  "🥳", "🤔", "😅", "🥲", "😭", "😤", "😡", "😱", "🤯", "🫠",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "🤝", "👌", "✌️", "🫶",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💯", "🔥",
  "✨", "🎉", "🎂", "🎁", "☕", "🍺", "🍜", "✈️", "🇩🇪", "🇰🇷",
];

const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || "";

type GifResult = {
  id: string;
  title: string;
  previewUrl: string;
  gifUrl: string;
};

type GiphyItem = {
  id: string;
  title?: string;
  images?: {
    fixed_width_small?: { url?: string };
    fixed_width?: { url?: string };
    downsized?: { url?: string };
    original?: { url?: string };
  };
};

type Props = {
  target: "title" | "content";
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
  disabled?: boolean;
};
export default function PostExpressionPicker({ target, value, setValue, disabled = false }: Props) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [gifError, setGifError] = useState("");

  function insertText(text: string) {
    const field = document.getElementById(target) as HTMLInputElement | HTMLTextAreaElement | null;
    const start = field?.selectionStart ?? value.length;
    const end = field?.selectionEnd ?? value.length;
    setValue(`${value.slice(0, start)}${text}${value.slice(end)}`);
    requestAnimationFrame(() => {
      if (!field) return;
      const next = start + text.length;
      field.focus();
      field.setSelectionRange(next, next);
    });
  }

  function chooseEmoji(emoji: string) {
    insertText(emoji);
    setEmojiOpen(false);
  }
  async function searchGifs(event: FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (!term || searching) return;
    if (!GIPHY_API_KEY) {
      setGifError("GIF 검색을 사용하려면 GIPHY API 키 설정이 필요합니다.");
      return;
    }

    setSearching(true);
    setGifError("");
    try {
      const params = new URLSearchParams({
        api_key: GIPHY_API_KEY,
        q: term,
        limit: "18",
        rating: "pg-13",
        lang: "ko",
      });
      const response = await fetch(`https://api.giphy.com/v1/gifs/search?${params}`);
      if (!response.ok) throw new Error("GIF 검색에 실패했습니다.");
      const payload = await response.json() as { data?: GiphyItem[] };
      const items: GifResult[] = (payload.data || []).flatMap((item) => {
        const previewUrl = item.images?.fixed_width_small?.url || item.images?.fixed_width?.url;
        const gifUrl = item.images?.downsized?.url || item.images?.original?.url;
        return previewUrl && gifUrl ? [{ id: item.id, title: item.title || "GIF", previewUrl, gifUrl }] : [];
      });
      setResults(items);
    } catch (error) {
      setGifError(error instanceof Error ? error.message : "GIF 검색에 실패했습니다.");
    } finally {
      setSearching(false);
    }
  }
  function chooseGif(gif: GifResult) {
    const field = document.getElementById("content") as HTMLTextAreaElement | null;
    const start = field?.selectionStart ?? value.length;
    const end = field?.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const prefix = before && !before.endsWith("\n") ? "\n" : "";
    const suffix = after && !after.startsWith("\n") ? "\n" : "";
    setValue(`${before}${prefix}[[GH_GIF:${gif.gifUrl}]]${suffix}${after}`);
    setGifOpen(false);
    requestAnimationFrame(() => field?.focus());
  }

  return (
    <div className="post-expression-picker">
      <div className="post-expression-actions">
        <button type="button" onClick={() => { setEmojiOpen((open) => !open); setGifOpen(false); }} disabled={disabled}>
          😀 이모티콘
        </button>
        {target === "content" && GIPHY_API_KEY && (
          <button type="button" onClick={() => { setGifOpen((open) => !open); setEmojiOpen(false); }} disabled={disabled}>
            GIF
          </button>
        )}
      </div>

      {emojiOpen && (
        <div className="post-emoji-popover" aria-label="이모티콘 선택">
          {EMOJIS.map((emoji) => (
            <button type="button" key={emoji} onClick={() => chooseEmoji(emoji)}>{emoji}</button>
          ))}
        </div>
      )}
      {gifOpen && target === "content" && (
        <div className="post-gif-popover">
          <form className="post-gif-search" onSubmit={searchGifs}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="기분이나 상황으로 GIF 검색"
              maxLength={50}
              autoFocus
            />
            <button type="submit" disabled={searching || !query.trim()}>{searching ? "검색 중" : "검색"}</button>
          </form>
          {gifError && <p className="post-gif-error">{gifError}</p>}
          {!GIPHY_API_KEY && !gifError && (
            <p className="post-gif-hint">GIPHY API 키를 연결하면 GIF 검색이 활성화됩니다.</p>
          )}
          {results.length > 0 && (
            <div className="post-gif-grid">
              {results.map((gif) => (
                <button type="button" key={gif.id} onClick={() => chooseGif(gif)} title={gif.title}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gif.previewUrl} alt={gif.title} loading="lazy" />
                </button>
              ))}
            </div>
          )}
          <div className="post-gif-attribution">Powered by GIPHY</div>
        </div>
      )}
    </div>
  );
}
