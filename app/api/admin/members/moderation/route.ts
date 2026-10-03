import "server-only";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const actions = new Set(["suspend_7d", "suspend_30d", "ban_permanent", "restore"]);

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const body = await request.json().catch(() => null) as { userId?: unknown; action?: unknown; reason?: unknown } | null;
  if (!token || !body || typeof body.userId !== "string" || typeof body.action !== "string" || typeof body.reason !== "string" || !actions.has(body.action) || body.reason.trim().length < 3 || body.reason.trim().length > 500) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !publicKey || !serviceKey) return NextResponse.json({ error: "server_config" }, { status: 500 });
  const userClient = createClient(url, publicKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await userClient.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: caller } = await userClient.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  if (caller?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const banDuration = body.action === "suspend_7d" ? "168h" : body.action === "suspend_30d" ? "720h" : body.action === "ban_permanent" ? "876000h" : "none";
  const { error: banError } = await admin.auth.admin.updateUserById(body.userId, { ban_duration: banDuration });
  if (banError) return NextResponse.json({ error: "auth_update_failed" }, { status: 502 });
  const { data, error } = await userClient.rpc("admin_set_member_moderation", { p_target_user_id: body.userId, p_action: body.action, p_reason: body.reason.trim() });
  if (error) {
    // Do not claim success if the auditable database state was not written.
    return NextResponse.json({ error: "audit_write_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, moderation: data }, { headers: { "Cache-Control": "no-store" } });
}
