import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { ArticleDraftEvidence, GeneratedArticleDraft } from "./draft";
import { selectStockImage } from "./stockImage";

function env(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error("Article automation server environment is not configured.");
  return value;
}

function client() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function draftSlug(fingerprint: string): string {
  return `auto-draft-${fingerprint.slice(0, 16)}`;
}

export async function persistGeneratedArticleDraft(input: {
  fingerprint: string;
  draft: GeneratedArticleDraft;
  evidence: ArticleDraftEvidence;
}): Promise<{ articleId: string; slug: string }> {
  const supabase = client();
  const slug = draftSlug(input.fingerprint);
  const stockImage = await selectStockImage(input.draft, input.evidence);
  const { data: article, error: insertError } = await supabase
    .from("articles")
    .insert({
      slug,
      title: input.draft.title.trim(),
      summary: input.draft.summary.trim(),
      content: input.draft.content.trim(),
      category: input.draft.category,
      image_url: stockImage.imageUrl,
      source_urls: stockImage.sourceUrls,
      status: "draft",
      is_featured: false,
      published_at: null,
      ai_generated: true,
      source_checked_at: null,
      review_status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !article?.id) throw new Error("Generated article draft persistence failed.");

  const { error: sourceError } = await supabase
    .from("article_sources")
    .update({ processing_status: "processed", article_id: article.id })
    .eq("fingerprint", input.fingerprint);

  if (sourceError) {
    await supabase.from("articles").delete().eq("id", article.id);
    throw new Error("Generated article source linking failed.");
  }

  return { articleId: article.id as string, slug };
}

export async function markArticleSourceFailed(fingerprint: string): Promise<void> {
  const supabase = client();
  await supabase
    .from("article_sources")
    .update({ processing_status: "failed" })
    .eq("fingerprint", fingerprint)
    .eq("processing_status", "reserved");
}
