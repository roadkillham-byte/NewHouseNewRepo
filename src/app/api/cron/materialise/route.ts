import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { households } from "@/db/schema";
import { materialiseChoresForHousehold } from "@/lib/materialise";
import { materialiseBillsForHousehold } from "@/lib/materialise-bills";
import { pruneLoginAttempts } from "@/lib/rate-limit";

/**
 * Daily materialise job. Rolls the chore-instance and bill-period windows
 * forward, backfills anything missing, and prunes expired login attempts.
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
    const chores = await materialiseChoresForHousehold(household.id);
    const bills = await materialiseBillsForHousehold(household.id);
    results.push({ householdId: household.id, name: household.name, chores, bills });
  }

  // Housekeeping: login attempts only exist to power the rate limiter's
  // 15-minute window, so anything older than the retention period is dead
  // weight.
  const prunedLoginAttempts = await pruneLoginAttempts();

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    results,
    prunedLoginAttempts,
  });
}
