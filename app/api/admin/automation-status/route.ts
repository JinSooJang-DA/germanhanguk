import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "server_config" }, { status: 500 });

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let worker: WorkerStatus = { state: "never_run", startedAt: null, finishedAt: null, exitCode: null };
  try {
    const raw = await readFile(path.join(process.cwd(), "logs", "article-worker-status.json"), "utf8");
    worker = JSON.parse(raw) as WorkerStatus;
  } catch {
    // Fresh installs and VPS migrations may not have a status file yet.
  }

  return NextResponse.json({
    worker,
    schedule: ["08:00", "19:00"],
    timezone: "Europe/Berlin",
    maxArticlesPerRun: 1,
  });
}
