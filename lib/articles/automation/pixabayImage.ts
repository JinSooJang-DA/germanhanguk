import { createClient } from "@supabase/supabase-js";

const BUCKET = "article-images";

interface PixabayHit {
  id: number;
  pageURL: string;
  largeImageURL?: string;
  webformatURL: string;
  user: string;
  user_id: number;
}

export interface PixabayImage {
  imageUrl: string;
  photoUrl: string;
  photographer: string;
  photographerUrl: string;
}

function env(name: "PIXABAY_API_KEY" | "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name]?.trim();
  if (!value) return null;
  return value;
}
async function search(query: string): Promise<PixabayHit | null> {
  const key = env("PIXABAY_API_KEY");
  if (!key) return null;
  const url = new URL("https://pixabay.com/api/");
  url.searchParams.set("key", key);
  url.searchParams.set("q", query.slice(0, 100));
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("orientation", "horizontal");
  url.searchParams.set("safesearch", "true");
  url.searchParams.set("order", "popular");
  url.searchParams.set("per_page", "6");

  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) return null;
  const payload = await response.json() as { hits?: PixabayHit[] };
  return payload.hits?.[0] ?? null;
}

async function storageClient() {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
async function persistImage(hit: PixabayHit): Promise<string | null> {
  const supabase = await storageClient();
  if (!supabase) return null;
  const remoteUrl = hit.largeImageURL || hit.webformatURL;
  const imageResponse = await fetch(remoteUrl, { signal: AbortSignal.timeout(10_000) });
  if (!imageResponse.ok) return null;
  const bytes = await imageResponse.arrayBuffer();
  const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

  const { error: bucketError } = await supabase.storage.getBucket(BUCKET);
  if (bucketError) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error && !error.message.toLowerCase().includes("already exists")) return null;
  }

  const path = `pixabay/${hit.id}.jpg`;
  const { error: uploadError } = await supabase.storage.from(BUCKET)
    .upload(path, bytes, { contentType, upsert: true, cacheControl: "31536000" });
  if (uploadError) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
export async function searchPixabayImage(query: string): Promise<PixabayImage | null> {
  try {
    const hit = await search(query);
    if (!hit) return null;
    const imageUrl = await persistImage(hit);
    if (!imageUrl) return null;
    return {
      imageUrl,
      photoUrl: hit.pageURL,
      photographer: hit.user || "Pixabay contributor",
      photographerUrl: `https://pixabay.com/users/${encodeURIComponent(hit.user)}-${hit.user_id}/`,
    };
  } catch {
    return null;
  }
}
