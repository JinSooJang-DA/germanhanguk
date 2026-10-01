import { createClient } from "@supabase/supabase-js";
import { fetchMesseDuesseldorfEvents } from "./sources/duesseldorf";

function required(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export type MesseSyncSummary = {
  ok: true;
  sourceProvider: string;
  syncedEventCount: number;
  skippedEventCount: number;
  syncedAt: string;
};

export async function syncMesseDuesseldorf(): Promise<MesseSyncSummary> {
  const result = await fetchMesseDuesseldorfEvents();
  if (result.error) throw new Error(`Messe source failed: ${result.error}`);
  if (result.events.length < 5) throw new Error("Messe source sanity check failed: too few events");

  const syncedAt = new Date().toISOString();
  const rows = result.events.map((event) => ({
    source_provider: event.sourceProvider,
    source_event_id: event.sourceEventId,
    source_url: event.sourceUrl,
    title: event.title,
    summary: event.summary ?? null,
    starts_on: event.startsOn,
    ends_on: event.endsOn,
    city: event.city,
    venue: event.venue,
    official_url: event.officialUrl ?? null,
    is_active: true,
    last_seen_at: syncedAt,
    last_synced_at: syncedAt,
  }));

  const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { error: upsertError } = await supabase
    .from("messe_events")
    .upsert(rows, { onConflict: "source_provider,source_event_id" });
  if (upsertError) throw new Error(`Messe upsert failed: ${upsertError.message}`);

  const { error: staleError } = await supabase
    .from("messe_events")
    .update({ is_active: false, last_synced_at: syncedAt })
    .eq("source_provider", result.sourceProvider)
    .lt("last_seen_at", syncedAt);
  if (staleError) throw new Error(`Messe stale-event update failed: ${staleError.message}`);

  return {
    ok: true,
    sourceProvider: result.sourceProvider,
    syncedEventCount: rows.length,
    skippedEventCount: result.skippedEventCount,
    syncedAt,
  };
}
