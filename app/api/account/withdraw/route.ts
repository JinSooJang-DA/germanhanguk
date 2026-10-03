import "server-only";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { parseWithdrawalRequest } from "@/lib/withdrawal";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const mode = parseWithdrawalRequest(await request.json().catch(() => null));
  if (!mode) return NextResponse.json({ error: "Invalid confirmation" }, { status: 400 });
  const requestId = crypto.randomUUID();
  let stage = "configuration";
  let bucket: string | undefined;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
    if (!url || !key) throw new Error("Missing Supabase public URL or publishable key");
    const client = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    stage = "authenticate";
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Avatars use flat UUID-timestamp names; post images use UUID folders.
    // Delete through Storage API, never manipulate storage metadata with SQL.
    const userId = data.user.id;
    for (bucket of mode === "remove" ? ["avatars", "post-images"] : ["avatars"]) {
      const prefix = bucket === "avatars" ? "" : userId;
      while (true) {
        stage = "storage-list";
        const { data: files, error: listError } = await client.storage.from(bucket).list(prefix, {
          limit: 100, ...(bucket === "avatars" ? { search: `${userId}-` } : {}),
        });
        if (listError) throw listError;
        const paths = (files || []).filter((file) => file.id &&
          (bucket !== "avatars" || file.name.startsWith(`${userId}-`)))
          .map((file) => prefix ? `${prefix}/${file.name}` : file.name);
        if (!paths.length) break;
        stage = "storage-remove";
        const { data: removed, error: removeError } = await client.storage.from(bucket).remove(paths);
        if (removeError) throw removeError;
        if (removed?.length !== paths.length) throw new Error("Storage cleanup did not delete every requested object");
      }
    }
    bucket = undefined;
    stage = "database-withdrawal";
    const { error: withdrawalError } = await client.rpc("withdraw_member", { p_mode: mode });
    if (withdrawalError) throw withdrawalError;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    // Deliberately omit tokens, user IDs, content and database row details.
    // Stage and upstream codes identify the failure without exposing it to clients.
    const upstream = cause && typeof cause === "object" ? cause as Record<string, unknown> : {};
    console.error("Member withdrawal failed", {
      requestId, stage, mode, bucket,
      code: typeof upstream.code === "string" ? upstream.code : undefined,
      status: upstream.statusCode ?? upstream.status,
    });
    return NextResponse.json({ error: "탈퇴 처리에 실패했습니다. 다시 시도해 주세요. / Austritt fehlgeschlagen. Bitte erneut versuchen." }, { status: 500 });
  }
}
