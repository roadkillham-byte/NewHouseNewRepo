import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { bills, billPeriods, billShares, members } from "@/db/schema";
import { expandRule } from "./recurrence";
import { splitEven } from "./split";
import { MATERIALISE_WINDOW_DAYS } from "./materialise";
import { addUtcDays, houseToday } from "./today";
import { getHouseholdTimezone } from "@/db/queries/settings";

type BillRow = typeof bills.$inferSelect;

/**
 * Materialises bill_periods for one household, mirroring
 * materialiseChoresForHousehold: idempotent, safe to re-run. For a
 * fixed-amount bill, shares are created immediately (split evenly across
 * active members); for a variable bill, the period is created with
 * total_cents left null, and shares are created once someone enters the
 * actual amount (see setBillPeriodAmountAction).
 */
export async function materialiseBillsForHousehold(
  householdId: string,
  windowDays: number = MATERIALISE_WINDOW_DAYS,
): Promise<{ billsProcessed: number; periodsCreated: number }> {
  const today = houseToday(new Date(), await getHouseholdTimezone(householdId));
  const windowEnd = addUtcDays(today, windowDays);

  const activeBills = await db
    .select()
    .from(bills)
    .where(and(eq(bills.householdId, householdId), eq(bills.active, true)));

  const activeMemberIds = (
    await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.householdId, householdId), eq(members.active, true)))
  ).map((m) => m.id);

  let periodsCreated = 0;
  for (const bill of activeBills) {
    periodsCreated += await materialiseOneBill(bill, activeMemberIds, today, windowEnd);
  }

  return { billsProcessed: activeBills.length, periodsCreated };
}

async function materialiseOneBill(
  bill: BillRow,
  activeMemberIds: string[],
  windowStart: Date,
  windowEnd: Date,
): Promise<number> {
  const dueDates = expandRule(bill.rrule, bill.startDate, windowStart, windowEnd);
  if (dueDates.length === 0) return 0;

  const existing = await db
    .select({ dueDate: billPeriods.dueDate })
    .from(billPeriods)
    .where(and(eq(billPeriods.billId, bill.id), gte(billPeriods.dueDate, windowStart)));
  const existingDueDates = new Set(existing.map((row) => isoDate(row.dueDate)));

  // Need the due date immediately before the window too, to compute the
  // first missing period's periodStart correctly (a period covers the time
  // since the previous due date, not since the window start).
  const priorDueDate = await getMostRecentDueDateBefore(bill.id, windowStart);

  let previousDueDate = priorDueDate ?? bill.startDate;
  let created = 0;

  for (const dueDate of dueDates) {
    if (existingDueDates.has(isoDate(dueDate))) {
      previousDueDate = dueDate;
      continue;
    }

    const periodStart = previousDueDate;
    const periodEnd = addUtcDays(dueDate, -1);
    const totalCents = bill.amountMode === "fixed" ? bill.defaultAmountCents : null;

    const [period] = await db
      .insert(billPeriods)
      .values({ billId: bill.id, periodStart, periodEnd, dueDate, totalCents })
      .onConflictDoNothing()
      .returning({ id: billPeriods.id });

    if (period) {
      created++;
      if (totalCents !== null && activeMemberIds.length > 0) {
        await createEvenShares(period.id, totalCents, activeMemberIds);
      }
    }

    previousDueDate = dueDate;
  }

  return created;
}

/** Creates bill_shares for a period, split evenly. Used both at materialise time (fixed bills) and when a variable amount is entered. */
export async function createEvenShares(
  periodId: string,
  totalCents: number,
  memberIds: string[],
): Promise<void> {
  const shares = splitEven(totalCents, memberIds);
  await db
    .insert(billShares)
    .values(shares.map((s) => ({ periodId, memberId: s.memberId, amountOwedCents: s.amountCents })))
    .onConflictDoNothing();
}

async function getMostRecentDueDateBefore(billId: string, before: Date): Promise<Date | null> {
  const rows = await db
    .select({ dueDate: billPeriods.dueDate })
    .from(billPeriods)
    .where(eq(billPeriods.billId, billId));
  const priorDates = rows.map((r) => r.dueDate).filter((d) => d < before);
  if (priorDates.length === 0) return null;
  return priorDates.reduce((max, d) => (d > max ? d : max));
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
