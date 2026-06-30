import { NextRequest, NextResponse } from "next/server";
import { checkHealthStatus, googleHealthConfigured } from "@/lib/googleHealth";

export async function GET(request: NextRequest) {
  if (!googleHealthConfigured()) {
    return NextResponse.json({ configured: false });
  }

  const timezone = request.nextUrl.searchParams.get("timezone") ?? undefined;
  const status = await checkHealthStatus(timezone);
  return NextResponse.json({
    configured: true,
    ...status,
    checkedAt: new Date().toISOString(),
  });
}
