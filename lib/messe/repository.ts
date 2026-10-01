import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { MesseEventCandidate } from "./types";

type MesseEventRow = {
  source_provider: MesseEventCandidate["sourceProvider"];
  source_event_id: string;
  source_url: string;
  title: string;
  summary: string | null;
  starts_on: string;
  ends_on: string;
  city: string;
  venue: string;
  official_url: string | null;
};

function env(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error("Messe public database environment is not configured.");
  return value;
}

function publicClient() {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
export async function getUpcomingMesseEvents(limit = 24): Promise<MesseEventCandidate[]> {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const { data, error } = await publicClient()
    .from("messe_events")
    .select("source_provider,source_event_id,source_url,title,summary,starts_on,ends_on,city,venue,official_url")
    .eq("is_active", true)
    .gte("ends_on", today)
    .order("starts_on", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Messe database read failed: ${error.message}`);

  return ((data ?? []) as MesseEventRow[]).map((row) => ({
    sourceProvider: row.source_provider,
    sourceEventId: row.source_event_id,
    sourceUrl: row.source_url,
    title: row.title,
    summary: row.summary ?? undefined,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    city: row.city,
    venue: row.venue,
    officialUrl: row.official_url ?? undefined,
  }));
}
