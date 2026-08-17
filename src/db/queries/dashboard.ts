import { and, asc, eq, gte, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  billPeriods,
  bills,
  billShares,
  choreDefinitions,
  choreInstances,
  furnitureItems,
  members,
} from "@/db/schema";

/**
 * The dashboard's data layer. Everything here is scoped to one household
 * and one "today", and deliberately returns small, already-shaped results —
 * the page renders them directly rather than filtering in the component.
 */

/** Chores due today or earlier that are still pending, across the whole house. */
export async function getOutstandingChores(householdId: string, today: Date) {
  return db
    .select({ instance: choreInstances, definition: choreDefinitions, assignee: members })
    .from(choreInstances)
    .innerJoin(choreDefinitions, eq(choreInstances.definitionId, choreDefinitions.id))
    .leftJoin(members, eq(choreInstances.assigneeId, members.id))
    .where(
      and(
        eq(choreDefinitions.householdId, householdId),
        eq(choreInstances.status, "pending"),
        lte(choreInstances.dueDate, today),
      ),
    )
    .orderBy(asc(choreInstances.dueDate));
}

export type OutstandingChoreRow = Awaited<ReturnType<typeof getOutstandingChores>>[number];

/** Bill periods due within the next `days` days (or already overdue) that still have unpaid shares. */
export async function getUpcomingBills(householdId: string, today: Date, days: number) {
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + days);

  const periods = await db
    .select({ period: billPeriods, bill: bills })
    .from(billPeriods)
    .innerJoin(bills, eq(billPeriods.billId, bills.id))
    .where(and(eq(bills.householdId, householdId), lte(billPeriods.dueDate, horizon)))
    .orderBy(asc(billPeriods.dueDate));

  if (periods.length === 0) return [];

  const periodIds = periods.map((p) => p.period.id);
  const shareRows = await db
    .select({ share: billShares, member: members })
    .from(billShares)
    .innerJoin(members, eq(billShares.memberId, members.id))
    .where(inArray(billShares.periodId, periodIds));

  const sharesByPeriod = new Map<string, typeof shareRows>();
  for (const row of shareRows) {
    const existing = sharesByPeriod.get(row.share.periodId);
    if (existing) existing.push(row);
    else sharesByPeriod.set(row.share.periodId, [row]);
  }

  return periods
    .map((row) => ({ ...row, shares: sharesByPeriod.get(row.period.id) ?? [] }))
    // Anything fully paid is done with — it doesn't belong on a
    // "what needs attention" dashboard.
    .filter((row) => row.shares.length === 0 || row.shares.some((s) => s.share.paidAt === null));
}

export type UpcomingBillRow = Awaited<ReturnType<typeof getUpcomingBills>>[number];

/** What one member personally owes right now, in cents. */
export async function getPersonalBalance(memberId: string): Promise<number> {
  const [row] = await db
    .select({
      owedCents: sql<number>`coalesce(sum(${billShares.amountOwedCents}), 0)`.mapWith(Number),
    })
    .from(billShares)
    .where(and(eq(billShares.memberId, memberId), isNull(billShares.paidAt)));
  return row?.owedCents ?? 0;
}

/** House-level counts for the status tiles. */
export async function getHouseStats(householdId: string, today: Date) {
  const [choresPending] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(choreInstances)
    .innerJoin(choreDefinitions, eq(choreInstances.definitionId, choreDefinitions.id))
    .where(
      and(
        eq(choreDefinitions.householdId, householdId),
        eq(choreInstances.status, "pending"),
        lte(choreInstances.dueDate, today),
      ),
    );

  const [billsUnpaid] = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
      totalCents: sql<number>`coalesce(sum(${billShares.amountOwedCents}), 0)`.mapWith(Number),
    })
    .from(billShares)
    .innerJoin(billPeriods, eq(billShares.periodId, billPeriods.id))
    .innerJoin(bills, eq(billPeriods.billId, bills.id))
    .where(and(eq(bills.householdId, householdId), isNull(billShares.paidAt)));

  const [furnitureNeeded] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(furnitureItems)
    .where(
      and(eq(furnitureItems.householdId, householdId), ne(furnitureItems.status, "owned")),
    );

  return {
    choresPendingCount: choresPending?.count ?? 0,
    unpaidShareCount: billsUnpaid?.count ?? 0,
    unpaidTotalCents: billsUnpaid?.totalCents ?? 0,
    furnitureNeededCount: furnitureNeeded?.count ?? 0,
  };
}

/** Chores completed in the last `days` days — the "recently done" feed. */
export async function getRecentActivity(householdId: string, today: Date, days: number) {
  const since = new Date(today);
  since.setUTCDate(since.getUTCDate() - days);

  return db
    .select({
      instance: choreInstances,
      definition: choreDefinitions,
      completedBy: members,
    })
    .from(choreInstances)
    .innerJoin(choreDefinitions, eq(choreInstances.definitionId, choreDefinitions.id))
    .leftJoin(members, eq(choreInstances.completedBy, members.id))
    .where(
      and(
        eq(choreDefinitions.householdId, householdId),
        eq(choreInstances.status, "done"),
        gte(choreInstances.completedAt, since),
      ),
    )
    .orderBy(sql`${choreInstances.completedAt} desc`)
    .limit(8);
}

export type RecentActivityRow = Awaited<ReturnType<typeof getRecentActivity>>[number];
