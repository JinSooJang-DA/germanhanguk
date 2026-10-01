import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) throw new Error("Missing public Supabase environment variables");

  const db = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data, error, count } = await db
    .from("messe_events")
    .select("title,starts_on,ends_on,city,source_provider", { count: "exact" })
    .eq("is_active", true)
    .order("starts_on", { ascending: true });

  if (error) throw new Error(`Public Messe read failed: ${error.message}`);
  const today = new Date().toISOString().slice(0, 10);
  const future = (data ?? []).filter((event) => event.ends_on >= today);
  console.log(JSON.stringify({
    ok: true,
    publicActiveCount: count ?? data?.length ?? 0,
    futureCount: future.length,
    nextEvent: future[0] ?? null,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
