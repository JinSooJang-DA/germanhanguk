import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateOneArticleDraft } from "@/lib/articles/automation/runOneDraft";
import { getBerlinArticleAutomationSlot } from "@/lib/articles/automation/schedule";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function serverConfig() {
  return {
    url: process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "",
    geminiKey: process.env.GEMINI_API_KEY?.trim() || "",
  };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "missing_CRON_SECRET" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const slot = getBerlinArticleAutomationSlot(new Date());
  if (!slot) return NextResponse.json({ ok: true, skipped: "outside_berlin_schedule" });

  const config = serverConfig();
  const missing = [
    !config.url && "SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL",
    !config.serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
    !config.geminiKey && "GEMINI_API_KEY",
  ].filter(Boolean);
  if (missing.length) return NextResponse.json({ error: "server_config", missing }, { status: 503 });

  const admin = createClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: claimed, error: claimError } = await admin
    .from("article_automation_runs")
    .insert({ slot_key: slot.slotKey, local_date: slot.localDate, local_hour: slot.localHour, state: "running" })
    .select("id")
    .maybeSingle();

  if (claimError?.code === "23505") {
    return NextResponse.json({ ok: true, skipped: "already_run", slot: slot.slotKey });
  }
  if (claimError || !claimed) {
    console.error("Article cron slot claim failed:", claimError?.code || "unknown");
    return NextResponse.json({ error: "slot_claim_failed" }, { status: 500 });
  }

  try {
    const result = await generateOneArticleDraft();
    const articleId = result.ok ? result.articleId : null;
    const reason = result.ok ? "draft_created" : result.reason;
    await admin.from("article_automation_runs").update({
      state: "success", finished_at: new Date().toISOString(), article_id: articleId, result_reason: reason,
    }).eq("id", claimed.id);
    return NextResponse.json({ ok: true, slot: slot.slotKey, result });
  } catch (error) {
    const message = (error instanceof Error ? error.message : "Unknown article automation error").slice(0, 500);
    await admin.from("article_automation_runs").update({
      state: "failed", finished_at: new Date().toISOString(), error_message: message,
    }).eq("id", claimed.id);
    console.error("Article automation failed:", message);
    return NextResponse.json({ error: "generation_failed", slot: slot.slotKey }, { status: 500 });
  }
}
