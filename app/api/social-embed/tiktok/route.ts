import { NextRequest, NextResponse } from "next/server";

const ALLOWED_INPUT_HOSTS = new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"]);

function tiktokPostId(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (!["tiktok.com", "www.tiktok.com", "m.tiktok.com"].includes(host)) return null;
    return url.pathname.match(/^\/@[^/]*\/(?:video|photo)\/(\d+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("url");
  if (!value) return NextResponse.json({ error: "url is required" }, { status: 400 });

  let input: URL;
  try {
    input = new URL(value);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  if (input.protocol !== "https:" || !ALLOWED_INPUT_HOSTS.has(input.hostname.toLowerCase())) {
    return NextResponse.json({ error: "unsupported url" }, { status: 400 });
  }
  let id = tiktokPostId(input.toString());

  if (!id) {
    try {
      const response = await fetch(input, {
        redirect: "follow",
        cache: "no-store",
        headers: { "user-agent": "Mozilla/5.0 GermanHanguk/1.0" },
      });
      id = tiktokPostId(response.url);
    } catch {
      return NextResponse.json({ error: "could not resolve TikTok link" }, { status: 502 });
    }
  }

  if (!id) {
    return NextResponse.json({ error: "TikTok post id not found" }, { status: 422 });
  }

  return NextResponse.json({
    embedUrl: `https://www.tiktok.com/player/v1/${id}?description=1`,
  });
}
