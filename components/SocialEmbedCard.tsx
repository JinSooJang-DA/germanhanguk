"use client";

import { useState } from "react";
import type { SocialEmbed } from "@/lib/socialEmbeds";

const PROVIDER_LABEL = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
} as const;

export default function SocialEmbedCard({ embed }: { embed: SocialEmbed }) {
  const [active, setActive] = useState(false);
  const [embedUrl, setEmbedUrl] = useState(embed.embedUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const label = PROVIDER_LABEL[embed.provider];
  const allow =
    embed.provider === "youtube"
      ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      : "autoplay; encrypted-media; picture-in-picture; fullscreen";

  async function loadContent() {
    if (embedUrl) {
      setActive(true);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/social-embed/tiktok?url=${encodeURIComponent(embed.sourceUrl)}`);
      if (!response.ok) throw new Error("resolve failed");
      const data = (await response.json()) as { embedUrl?: string };
      if (!data.embedUrl) throw new Error("missing embed url");
      setEmbedUrl(data.embedUrl);
      setActive(true);
    } catch {
      setError("이 TikTok 링크를 불러오지 못했습니다. 아래 원본 링크로 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <figure className={`post-social-embed post-social-embed--${embed.provider}`}>
      {active && embedUrl ? (
        <iframe
          src={embedUrl}
          title={`${label} 게시물`}
          loading="lazy"
          allow={allow}
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="post-social-embed-consent">
          <strong>{label} 외부 콘텐츠</strong>
          <p>
            불러오기를 누르면 {label}에 연결되며 IP 주소 등 접속 정보가 해당 서비스에 전달될 수 있습니다.
          </p>
          <button type="button" onClick={() => void loadContent()} disabled={loading}>
            {loading ? "불러오는 중..." : `${label} 콘텐츠 불러오기`}
          </button>
          {error ? <p className="post-social-embed-error">{error}</p> : null}
        </div>
      )}
      <figcaption>
        <a href={embed.sourceUrl} target="_blank" rel="noopener noreferrer nofollow ugc">
          {label}에서 보기 ↗
        </a>
      </figcaption>
    </figure>
  );
}
