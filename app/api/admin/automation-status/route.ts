import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type WorkerStatus = {
  state: "never_run" | "running" | "success" | "failed" | "skipped";
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
};

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publicKey) return NextResponse.json({ error: "server_config" }, { status: 500 });

  const userClient = createClient(url, publicKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await userClient.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await userClient.from("profiles").select("role").eq("id", auth.user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const config = {
    CRON_SECRET: Boolean(process.env.CRON_SECRET?.trim()),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY?.trim()),
  };
  let worker: WorkerStatus = { state: "never_run", startedAt: null, finishedAt: null, exitCode: null };
  let lastResultReason: string | null = null;
  let lastError: string | null = null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceKey) {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: run } = await admin.from("article_automation_runs")
      .select("state,started_at,finished_at,result_reason,error_message")
      .order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (run) {
      worker = {
        state: run.state as WorkerStatus["state"],
        startedAt: run.started_at,
        finishedAt: run.finished_at,
        exitCode: run.state === "failed" ? 1 : run.state === "running" ? null : 0,
      };
      lastResultReason = run.result_reason;
      lastError = run.error_message;
    }
  }

  return NextResponse.json({
    worker,
    schedule: ["08:00", "19:00"],
    timezone: "Europe/Berlin",
    maxArticlesPerRun: 1,
    config,
    lastResultReason,
    lastError,
  });
}
