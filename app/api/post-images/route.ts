import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  MAX_POST_IMAGE_STORED_BYTES,
  POST_IMAGE_BUCKET,
} from "@/lib/postImages";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/webp"]);

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase server configuration is missing.");
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const admin = getAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function ensureBucket() {
  const admin = getAdminClient();
  const { data: bucket } = await admin.storage.getBucket(POST_IMAGE_BUCKET);
  if (!bucket) {
    const { error } = await admin.storage.createBucket(POST_IMAGE_BUCKET, {
      public: true,
      fileSizeLimit: MAX_POST_IMAGE_STORED_BYTES,
      allowedMimeTypes: ["image/webp"],
    });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
  return admin;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "이미지 파일이 없습니다." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_POST_IMAGE_STORED_BYTES) {
      return NextResponse.json({ error: "허용되지 않은 이미지 형식 또는 용량입니다." }, { status: 400 });
    }

    const admin = await ensureBucket();
    const path = `${user.id}/${crypto.randomUUID()}.webp`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage.from(POST_IMAGE_BUCKET).upload(path, bytes, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data } = admin.storage.from(POST_IMAGE_BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path });
  } catch (error) {
    console.error("Post image upload error:", error);
    return NextResponse.json({ error: "이미지 업로드에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const { paths } = await request.json() as { paths?: string[] };
    const safePaths = (paths || []).filter(
      (path) => typeof path === "string" && path.startsWith(`${user.id}/`),
    );
    if (safePaths.length === 0) return NextResponse.json({ ok: true });

    const admin = await ensureBucket();
    const { error } = await admin.storage.from(POST_IMAGE_BUCKET).remove(safePaths);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Post image delete error:", error);
    return NextResponse.json({ error: "이미지 삭제에 실패했습니다." }, { status: 500 });
  }
}
