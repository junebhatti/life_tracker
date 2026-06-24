import { NextResponse } from "next/server";
import { checkAccountsStatus, googleCalendarConfigured } from "@/lib/googleCalendar";

export async function GET() {
  if (!googleCalendarConfigured()) {
    return NextResponse.json({ configured: false, accounts: [] });
  }

  const accounts = await checkAccountsStatus();
  return NextResponse.json({
    configured: true,
    accounts,
    checkedAt: new Date().toISOString(),
  });
}
