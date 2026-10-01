import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { searchPixabayImage } from "../lib/articles/automation/pixabayImage";
import { buildStockImageQuery } from "../lib/articles/automation/stockImageQuery";

async function main() {
  loadEnvConfig(process.cwd());
  const url = process.env.SUPABASE_URL?.trim(), key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Supabase server env missing");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: articles, error } = await db.from("articles")
    .select("id,category,source_urls").eq("ai_generated", true).is("image_url", null).limit(10);
  if (error) throw error;
  let updated = 0;

  for (const article of articles || []) {
    const { data: source } = await db.from("article_sources").select("source_title").eq("article_id", article.id).maybeSingle();
    const query = buildStockImageQuery(article.category, [], source?.source_title || "");
    const image = await searchPixabayImage(query);
    if (!image) continue;
    const sources = Array.isArray(article.source_urls) ? article.source_urls.filter((x: any) => x?.kind !== "image") : [];
    const credit = { title: `Photo: ${image.photographer} / Pixabay`, url: image.photoUrl, kind: "image", photographer: image.photographer, photographerUrl: image.photographerUrl };
    const { error: updateError } = await db.from("articles").update({ image_url: image.imageUrl, source_urls: [...sources, credit] }).eq("id", article.id);
    if (!updateError) updated += 1;
  }
  console.log(JSON.stringify({ checked: articles?.length || 0, updated }));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
