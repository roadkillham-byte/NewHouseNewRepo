import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { households } from "@/db/schema";
import { materialiseChoresForHousehold } from "@/lib/materialise";

/**
 * Daily materialise job. Rolls the chore-instance window forward and
 * backfills any missing instances. Bill-period materialisation joins this
 * same endpoint in Phase 2.
 *
 * Authenticated via CRON_SECRET (a bearer token), not a user session — this
 * route is explicitly excluded from proxy.ts's auth matcher. Configure the
 * matching schedule in vercel.json.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allHouseholds = await db.select({ id: households.id, name: households.name }).from(households);

  const results = [];
  for (const household of allHouseholds) {
    const result = await materialiseChoresForHousehold(household.id);
    results.push({ householdId: household.id, name: household.name, ...result });
  }

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), results });
}
