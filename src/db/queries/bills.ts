import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { billPeriods, bills, billShares, members } from "@/db/schema";

/** Every bill definition for the household's management list. */
export async function getBillDefinitions(householdId: string) {
  return db
    .select()
    .from(bills)
    .where(eq(bills.householdId, householdId))
    .orderBy(desc(bills.active), asc(bills.name));
}

export type BillDefinitionRow = Awaited<ReturnType<typeof getBillDefinitions>>[number];

/** Bill periods due within [start, end], each with its shares (joined to member) for the timeline view. */
export async function getBillPeriodsForTimeline(householdId: string, start: Date, end: Date) {
  const periods = await db
    .select({ period: billPeriods, bill: bills })
    .from(billPeriods)
    .innerJoin(bills, eq(billPeriods.billId, bills.id))
    .where(
      and(eq(bills.householdId, householdId), gte(billPeriods.dueDate, start), lte(billPeriods.dueDate, end)),
    )
    .orderBy(asc(billPeriods.dueDate));

  if (periods.length === 0) return [];

  const periodIds = periods.map((p) => p.period.id);
  // Second join on members for whoever marked the share paid — that's the
  // audit trail that makes honour-system tracking defensible, and it's a
  // different person from the share's owner often enough to matter (someone
  // hands over cash, someone else records it).
  const markedByMember = alias(members, "marked_by_member");
  const shareRows = await db
    .select({ share: billShares, member: members, markedBy: markedByMember })
    .from(billShares)
    .innerJoin(members, eq(billShares.memberId, members.id))
    .leftJoin(markedByMember, eq(billShares.markedBy, markedByMember.id))
    .where(inArray(billShares.periodId, periodIds));

  const sharesByPeriod = new Map<string, typeof shareRows>();
  for (const row of shareRows) {
    const existing = sharesByPeriod.get(row.share.periodId);
    if (existing) existing.push(row);
    else sharesByPeriod.set(row.share.periodId, [row]);
  }

  return periods.map((row) => ({
    ...row,
    shares: sharesByPeriod.get(row.period.id) ?? [],
  }));
}

export type BillPeriodTimelineRow = Awaited<ReturnType<typeof getBillPeriodsForTimeline>>[number];

/** Per-member sum of everything currently unpaid, across all periods — "what you owe" and "what's owed to the house." */
export async function getOutstandingBalances(householdId: string) {
  return db
    .select({
      memberId: members.id,
      name: members.name,
      avatarColor: members.avatarColor,
      owedCents: sql<number>`coalesce(sum(${billShares.amountOwedCents}), 0)`.mapWith(Number),
    })
    .from(members)
    .leftJoin(
      billShares,
      and(eq(billShares.memberId, members.id), isNull(billShares.paidAt)),
    )
    .where(and(eq(members.householdId, householdId), eq(members.active, true)))
    .groupBy(members.id, members.name, members.avatarColor)
    .orderBy(desc(sql`coalesce(sum(${billShares.amountOwedCents}), 0)`));
}

/** Periods whose amount is still unset (variable bills awaiting entry). */
export async function getPendingAmountPeriods(householdId: string) {
  return db
    .select({ period: billPeriods, bill: bills })
    .from(billPeriods)
    .innerJoin(bills, eq(billPeriods.billId, bills.id))
    .where(and(eq(bills.householdId, householdId), isNull(billPeriods.totalCents)))
    .orderBy(asc(billPeriods.dueDate));
}

export type PendingAmountRow = Awaited<ReturnType<typeof getPendingAmountPeriods>>[number];
