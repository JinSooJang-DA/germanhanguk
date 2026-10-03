import { createClient } from "@supabase/supabase-js";
import { createArticleDraftEvidence } from "./evidence";
import { createArticleCandidateIdentity } from "./identity";
import { classifyArticleRelevance } from "./relevance";
import { fetchBundesregierungArticleCandidates } from "./sources/bundesregierung";
import { fetchBmfTaxArticleCandidates } from "./sources/bmfTax";
import { fetchBmasArticleCandidates } from "./sources/bmas";
import { fetchBamfArticleCandidates } from "./sources/bamf";
import { fetchBmgArticleCandidates } from "./sources/bmg";
import { fetchBmbfsfjArticleCandidates } from "./sources/bmbfsfj";
import { fetchBmwsbArticleCandidates } from "./sources/bmwsb";
import { fetchBmjvArticleCandidates } from "./sources/bmjv";
import { fetchBmvArticleCandidates } from "./sources/bmv";
import { validateGeneratedArticleDraft } from "./validator";
import { type ArticleDraftEvidence, type GeneratedArticleDraft } from "./draft";
import { buildArticleDraftPrompt } from "./prompt";
import { selectStockImage } from "./stockImage";

function required(name: "SUPABASE_SERVICE_ROLE_KEY" | "GEMINI_API_KEY"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function generate(evidence: ArticleDraftEvidence): Promise<GeneratedArticleDraft> {
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
  const prompt = buildArticleDraftPrompt(evidence);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": required("GEMINI_API_KEY") },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: prompt.system }] },
      contents: [{ parts: [{ text: prompt.user }] }],
    }),
  });
  if (!response.ok) {
    throw new Error(`Gemini failed (${response.status}); retry on a later worker run`);
  }

  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!text) throw new Error("Gemini returned no draft");
  const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(jsonText) as Omit<GeneratedArticleDraft, "sourceUrls">;
  return { ...parsed, sourceUrls: [{ title: evidence.source.name, url: evidence.source.canonicalUrl }] };
}

const MAX_CANDIDATE_AGE_MS = 45 * 24 * 60 * 60 * 1000;

function isRecentCandidate(publishedAt: string | undefined): boolean {
  if (!publishedAt) return false;
  const timestamp = Date.parse(publishedAt);
  return Number.isFinite(timestamp) && Date.now() - timestamp <= MAX_CANDIDATE_AGE_MS;
}

function matchesProviderScope(provider: string, matchedTopics: string[]): boolean {
  const requiredTopics: Record<string, string[]> = {
    "bmf-tax": ["tax-work", "housing-living-costs"],
    bmas: ["tax-work", "health-social-insurance", "family-support", "public-service-change"],
    bamf: ["immigration-residence"],
    bmg: ["health-social-insurance"],
    bmbfsfj: ["family-support", "education"],
    bmwsb: ["housing-living-costs"],
    bmjv: ["consumer-finance-infrastructure", "housing-living-costs"],
    bmv: ["transport-tickets-costs", "driving-license"],
  };
  const required = requiredTopics[provider];
  return !required || required.some((topic) => matchedTopics.includes(topic));
}

export async function generateOneArticleDraft() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL");
  const supabase = createClient(supabaseUrl, required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const results = await Promise.all([
    fetchBundesregierungArticleCandidates(),
    fetchBmfTaxArticleCandidates(),
    fetchBmasArticleCandidates(),
    fetchBamfArticleCandidates(),
    fetchBmgArticleCandidates(),
    fetchBmbfsfjArticleCandidates(),
    fetchBmwsbArticleCandidates(),
    fetchBmjvArticleCandidates(),
    fetchBmvArticleCandidates(),
  ]);
  const healthy = results.filter((result) => !result.error);
  if (healthy.length === 0) throw new Error("All official source fetches failed");
  for (const failed of results.filter((result) => result.error)) {
    console.warn(`Source fetch skipped: ${failed.sourceProvider} (${failed.error})`);
  }
  const candidates = healthy.flatMap((result) => result.candidates).sort((a, b) =>
    (b.publishedAt ? Date.parse(b.publishedAt) : 0) - (a.publishedAt ? Date.parse(a.publishedAt) : 0)
  );

  for (const candidate of candidates) {
    if (!isRecentCandidate(candidate.publishedAt)) continue;
    const relevance = classifyArticleRelevance(candidate);
    if (relevance.classification !== "relevant") continue;
    if (!matchesProviderScope(candidate.sourceProvider, relevance.matchedTopics)) continue;
    const identity = createArticleCandidateIdentity(candidate);
    if (!identity) continue;

    const { data: reserved, error: reserveError } = await supabase
      .from("article_sources")
      .upsert({
        fingerprint: identity.fingerprint,
        source_provider: candidate.sourceProvider,
        external_id: candidate.externalId?.trim() || null,
        canonical_url: identity.normalizedCanonicalUrl,
        source_title: candidate.title,
        source_published_at: candidate.publishedAt ?? null,
        relevance_classification: relevance.classification,
      }, { onConflict: "fingerprint", ignoreDuplicates: true })
      .select("id")
      .maybeSingle();
    if (reserveError) throw new Error("Source reservation failed");
    if (!reserved) {
      const { data: existing } = await supabase
        .from("article_sources")
        .select("id,processing_status,updated_at")
        .eq("fingerprint", identity.fingerprint)
        .maybeSingle();
      if (existing?.processing_status !== "failed") continue;
      const failedAt = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
      const retryCooldownMs = 15 * 60 * 1000;
      if (Date.now() - failedAt < retryCooldownMs) continue;
      const { data: retried, error: retryError } = await supabase
        .from("article_sources")
        .update({ processing_status: "reserved", article_id: null })
        .eq("id", existing.id)
        .eq("processing_status", "failed")
        .select("id")
        .maybeSingle();
      if (retryError || !retried) continue;
    }

    try {
      const evidence = createArticleDraftEvidence(candidate, relevance);
      const draft = await generate(evidence);
      const validation = validateGeneratedArticleDraft(draft, evidence);
      if (!validation.valid) throw new Error(`Draft validation failed: ${validation.errors.join(",")}`);
      const stockImage = await selectStockImage(draft, evidence);

      const slug = `auto-draft-${identity.fingerprint.slice(0, 16)}`;
      const { data: article, error: articleError } = await supabase
        .from("articles")
        .insert({
          slug, title: draft.title.trim(), summary: draft.summary.trim(), content: draft.content.trim(),
          category: draft.category, image_url: stockImage.imageUrl, source_urls: stockImage.sourceUrls, status: "draft", is_featured: false,
          published_at: null, ai_generated: true, source_checked_at: null, review_status: "pending",
        })
        .select("id")
        .single();
      if (articleError || !article?.id) throw new Error("Draft persistence failed");

      const { error: linkError } = await supabase
        .from("article_sources")
        .update({ processing_status: "processed", article_id: article.id })
        .eq("fingerprint", identity.fingerprint);
      if (linkError) {
        await supabase.from("articles").delete().eq("id", article.id);
        throw new Error("Source linking failed");
      }

      return {
        ok: true as const, articleId: article.id, slug, status: "draft" as const, reviewStatus: "pending" as const,
        model: process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash",
        sourceTitle: candidate.title, generatedTitle: draft.title, category: draft.category,
        sourceUrl: candidate.canonicalUrl, imageFound: Boolean(stockImage.imageUrl),
      };
    } catch (error) {
      await supabase.from("article_sources").update({ processing_status: "failed" }).eq("fingerprint", identity.fingerprint);
      throw error;
    }
  }

  return { ok: false as const, reason: "no_new_relevant_candidate" as const };
}
