export type SocialEmbed = {
  provider: "youtube" | "instagram" | "tiktok";
  sourceUrl: string;
  embedUrl: string | null;
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const INSTAGRAM_CODE = /^[A-Za-z0-9_-]+$/;
const TIKTOK_ID = /^\d+$/;

function normalizedHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function youtubeVideoId(url: URL): string | null {
  const host = normalizedHost(url.hostname);

  if (host === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }

  if (!["youtube.com", "m.youtube.com"].includes(host)) return null;

  if (url.pathname === "/watch") return url.searchParams.get("v");

  const match = url.pathname.match(/^\/(?:shorts|embed)\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function instagramEmbedPath(url: URL): string | null {
  const host = normalizedHost(url.hostname);
  if (host !== "instagram.com" && host !== "instagr.am") return null;

  const match = url.pathname.match(/^\/(p|reel|tv)\/([^/?#]+)/);
  if (!match || !INSTAGRAM_CODE.test(match[2])) return null;
  return `${match[1]}/${match[2]}`;
}
function tiktokVideoId(url: URL): string | null {
  const host = normalizedHost(url.hostname);
  if (host !== "tiktok.com" && host !== "m.tiktok.com") return null;

  const match = url.pathname.match(/^\/@[^/]*\/(?:video|photo)\/(\d+)/);
  return match?.[1] ?? null;
}

export function getSocialEmbed(value: string): SocialEmbed | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const youtubeId = youtubeVideoId(url);
  if (youtubeId && YOUTUBE_ID.test(youtubeId)) {
    return {
      provider: "youtube",
      sourceUrl: value,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?playsinline=1`,
    };
  }

  const instagramPath = instagramEmbedPath(url);
  if (instagramPath) {
    return {
      provider: "instagram",
      sourceUrl: value,
      embedUrl: `https://www.instagram.com/${instagramPath}/embed/`,
    };
  }
  const tiktokHost = normalizedHost(url.hostname);
  const isTikTokShortLink =
    tiktokHost === "vm.tiktok.com" ||
    tiktokHost === "vt.tiktok.com" ||
    (tiktokHost === "tiktok.com" && url.pathname.startsWith("/t/"));

  if (isTikTokShortLink) {
    return { provider: "tiktok", sourceUrl: value, embedUrl: null };
  }

  const tiktokId = tiktokVideoId(url);
  if (tiktokId && TIKTOK_ID.test(tiktokId)) {
    return {
      provider: "tiktok",
      sourceUrl: value,
      embedUrl: `https://www.tiktok.com/player/v1/${tiktokId}?description=1`,
    };
  }

  return null;
}
