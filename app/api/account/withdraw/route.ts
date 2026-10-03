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
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing server configuration");
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Avatars use flat UUID-timestamp names; post images use UUID folders.
    // Delete through Storage API, never manipulate storage metadata with SQL.
    const userId = data.user.id;
    for (const bucket of mode === "remove" ? ["avatars", "post-images"] : ["avatars"]) {
      const prefix = bucket === "avatars" ? "" : userId;
      while (true) {
        const { data: files, error: listError } = await admin.storage.from(bucket).list(prefix, {
          limit: 100, ...(bucket === "avatars" ? { search: `${userId}-` } : {}),
        });
        if (listError) throw new Error("Storage cleanup failed");
        const paths = (files || []).filter((file) => file.id &&
          (bucket !== "avatars" || file.name.startsWith(`${userId}-`)))
          .map((file) => prefix ? `${prefix}/${file.name}` : file.name);
        if (!paths.length) break;
        const { error: removeError } = await admin.storage.from(bucket).remove(paths);
        if (removeError) throw new Error("Storage cleanup failed");
      }
    }
    const { error: withdrawalError } = await admin.rpc("withdraw_member", { p_user_id: userId, p_mode: mode });
    if (withdrawalError) throw new Error("Withdrawal transaction failed");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "탈퇴 처리에 실패했습니다. 다시 시도해 주세요. / Austritt fehlgeschlagen. Bitte erneut versuchen." }, { status: 500 });
  }
}
