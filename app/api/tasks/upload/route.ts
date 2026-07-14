import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";
import { userIdFromRequest } from "@/lib/serverAuth";

// Never statically cache this route — every upload is a fresh write.
export const dynamic = "force-dynamic";

const BUCKET = "task-files";
const MAX_BYTES = 20 * 1024 * 1024; // 20MB — task references can be PDFs/docs.

/** Creates the storage bucket on first use so this works right after schema.sql. */
async function ensureBucket() {
  const admin = supabaseAdmin();
  const { data } = await admin.storage.getBucket(BUCKET);
  if (!data) {
    await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES });
  }
}

/** Keeps the original filename readable while stripping anything path-unsafe. */
function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "file";
}

export async function POST(request: NextRequest) {
  const userId = await userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large — 20MB max." }, { status: 400 });
  }

  try {
    await ensureBucket();
  } catch (error) {
    console.error("task upload: failed to ensure bucket:", error);
    return NextResponse.json({ error: "Failed to prepare storage." }, { status: 500 });
  }

  const original = safeName(file.name || "file");
  const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${original}`;

  const admin = supabaseAdmin();
  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) {
    console.error("task upload error:", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: pub.publicUrl, name: file.name || original }, { status: 201 });
}
