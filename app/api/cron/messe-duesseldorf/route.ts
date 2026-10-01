import { NextRequest, NextResponse } from "next/server";
import { syncMesseDuesseldorf } from "@/lib/messe/sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("Messe cron skipped: CRON_SECRET is not configured.");
    return NextResponse.json({ error: "server_config" }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await syncMesseDuesseldorf();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Messe Düsseldorf cron sync failed:", error);
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
