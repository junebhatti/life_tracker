import { NextResponse } from "next/server";
import { fetchHealthSnapshot, googleHealthConfigured } from "@/lib/googleHealth";

export async function GET() {
  if (!googleHealthConfigured()) {
    return NextResponse.json({ configured: false });
  }

  try {
    const snapshot = await fetchHealthSnapshot();
    return NextResponse.json({ configured: true, snapshot });
  } catch (error) {
    console.error("Google Health snapshot fetch failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { configured: true, error: "Couldn't load health data.", detail },
      { status: 502 },
    );
  }
}
