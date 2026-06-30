import { NextResponse } from "next/server";
import { checkHealthStatus, googleHealthConfigured } from "@/lib/googleHealth";

export async function GET() {
  if (!googleHealthConfigured()) {
    return NextResponse.json({ configured: false });
  }

  const status = await checkHealthStatus();
  return NextResponse.json({
    configured: true,
    ...status,
    checkedAt: new Date().toISOString(),
  });
}
