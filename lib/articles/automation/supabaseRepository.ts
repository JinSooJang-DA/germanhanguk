import { createClient } from "@supabase/supabase-js";
import "server-only";

import { createArticleCandidateIdentity } from "./identity";
import type {
  ArticleSourceRepository,
  ArticleSourceReservationInput,
  ArticleSourceReservationResult,
} from "./repository";

interface ArticleSourceInsertRow {
  fingerprint: string;
  source_provider: string;
  external_id: string | null;
  canonical_url: string;
  source_title: string;
  source_published_at: string | null;
  relevance_classification: ArticleSourceReservationInput["relevanceClassification"];
}

function requiredServerEnvironment(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error("Article automation server environment is not configured.");
  }

  return value;
}

function createArticleAutomationSupabaseClient() {
  const url = requiredServerEnvironment("SUPABASE_URL");
  const serviceRoleKey = requiredServerEnvironment("SUPABASE_SERVICE_ROLE_KEY");

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:") {
      throw new Error("Invalid article automation server URL.");
    }
  } catch {
    throw new Error("Article automation server is not configured correctly.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function toInsertRow(input: ArticleSourceReservationInput): ArticleSourceInsertRow {
  const identity = createArticleCandidateIdentity(input.candidate);
  if (!identity || identity.fingerprint !== input.fingerprint) {
    throw new Error("Invalid article source reservation input.");
  }

  return {
    fingerprint: identity.fingerprint,
    source_provider: input.candidate.sourceProvider,
    external_id: input.candidate.externalId?.trim() || null,
    canonical_url: identity.normalizedCanonicalUrl,
    source_title: input.candidate.title,
    source_published_at: input.candidate.publishedAt ?? null,
    relevance_classification: input.relevanceClassification,
  };
}

/**
 * Server-only persistence adapter. It intentionally uses non-public env names
 * and is never imported by the browser Supabase client or the dry-run path.
 */
export function createSupabaseArticleSourceRepository(): ArticleSourceRepository {
  const supabase = createArticleAutomationSupabaseClient();

  return {
    async reserve(input): Promise<ArticleSourceReservationResult> {
      const row = toInsertRow(input);
      const { data: insertedRow, error: insertError } = await supabase
        .from("article_sources")
        .upsert(row, { onConflict: "fingerprint", ignoreDuplicates: true })
        .select("id")
        .maybeSingle();

      if (insertError) {
        throw new Error("Article source reservation failed.");
      }

      if (insertedRow) {
        return { status: "reserved" };
      }

      const { data: existingRow, error: seenError } = await supabase
        .from("article_sources")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("fingerprint", row.fingerprint)
        .select("id")
        .maybeSingle();

      if (seenError || !existingRow) {
        throw new Error("Article source reservation failed.");
      }

      return { status: "already_exists" };
    },
  };
}
