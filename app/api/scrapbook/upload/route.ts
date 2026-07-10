import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";
import { userIdFromRequest } from "@/lib/serverAuth";

// Never statically cache this route — every upload is a fresh write.
export const dynamic = "force-dynamic";

const BUCKET = "scrapbook";
const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const EXT_FOR_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

/** Single-user: accepts the owner's Supabase session or the SCRAPBOOK_API_KEY header (for mobile). */
async function isAuthorized(request: NextRequest): Promise<boolean> {
  const apiKey = process.env.SCRAPBOOK_API_KEY;
  if (apiKey && request.headers.get("x-scrapbook-key") === apiKey) return true;
  const userId = await userIdFromRequest(request);
  return !!userId;
}

/** Creates the storage bucket on first use so this route works right after
 *  pasting schema.sql, without a manual Supabase dashboard step. */
async function ensureBucket() {
  const admin = supabaseAdmin();
  const { data } = await admin.storage.getBucket(BUCKET);
  if (!data) {
    await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type — use JPG, PNG, GIF, or WebP." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large — 8MB max." }, { status: 400 });
  }

  try {
    await ensureBucket();
  } catch (error) {
    console.error("scrapbook upload: failed to ensure bucket:", error);
    return NextResponse.json({ error: "Failed to prepare storage." }, { status: 500 });
  }

  const ext = EXT_FOR_TYPE[file.type] ?? "jpg";
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const admin = supabaseAdmin();
  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error("scrapbook upload error:", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: pub.publicUrl }, { status: 201 });
}
