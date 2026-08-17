import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { choreDefinitions, choreInstances, members } from "@/db/schema";

/** All chore instances due within [start, end] (inclusive) for a household, joined to their definition and assignee. */
export async function getChoreInstancesForRange(householdId: string, start: Date, end: Date) {
  return db
    .select({ instance: choreInstances, definition: choreDefinitions, assignee: members })
    .from(choreInstances)
    .innerJoin(choreDefinitions, eq(choreInstances.definitionId, choreDefinitions.id))
    .leftJoin(members, eq(choreInstances.assigneeId, members.id))
    .where(
      and(
        eq(choreDefinitions.householdId, householdId),
        gte(choreInstances.dueDate, start),
        lte(choreInstances.dueDate, end),
        // Recurring definitions only — one-off tasks (rrule null) have
        // their own section (the move-in checklist) and shouldn't also
        // clutter the calendar/today list.
        sql`${choreDefinitions.rrule} is not null`,
      ),
    )
    .orderBy(asc(choreInstances.dueDate));
}

export type ChoreInstanceRow = Awaited<ReturnType<typeof getChoreInstancesForRange>>[number];

export async function getTodaysChores(householdId: string, today: Date) {
  return getChoreInstancesForRange(householdId, today, today);
}

/** Every chore definition for the household's management list, including inactive ones. */
export async function getChoreDefinitions(householdId: string) {
  return db
    .select({ definition: choreDefinitions, fixedAssignee: members })
    .from(choreDefinitions)
    .leftJoin(members, eq(choreDefinitions.fixedAssigneeId, members.id))
    .where(eq(choreDefinitions.householdId, householdId))
    .orderBy(desc(choreDefinitions.active), asc(choreDefinitions.title));
}

export type ChoreDefinitionRow = Awaited<ReturnType<typeof getChoreDefinitions>>[number];

/** One-off tasks (rrule is null) — the move-in checklist — with their single instance's completion state. */
export async function getMoveInChecklist(householdId: string) {
  return db
    .select({ definition: choreDefinitions, instance: choreInstances, assignee: members })
    .from(choreDefinitions)
    .leftJoin(choreInstances, eq(choreInstances.definitionId, choreDefinitions.id))
    .leftJoin(members, eq(choreInstances.assigneeId, members.id))
    .where(and(eq(choreDefinitions.householdId, householdId), isNull(choreDefinitions.rrule)))
    .orderBy(asc(choreDefinitions.startDate));
}

export type MoveInChecklistRow = Awaited<ReturnType<typeof getMoveInChecklist>>[number];

/** Effort-point totals per active member for chores completed since `sinceDate` — the fairness ledger. */
export async function getFairnessLedger(householdId: string, sinceDate: Date) {
  return db
    .select({
      memberId: members.id,
      name: members.name,
      avatarColor: members.avatarColor,
      points: sql<number>`coalesce(sum(${choreDefinitions.effortPoints}), 0)`.mapWith(Number),
    })
    .from(members)
    .leftJoin(
      choreInstances,
      and(
        eq(choreInstances.assigneeId, members.id),
        eq(choreInstances.status, "done"),
        gte(choreInstances.completedAt, sinceDate),
      ),
    )
    .leftJoin(choreDefinitions, eq(choreInstances.definitionId, choreDefinitions.id))
    .where(and(eq(members.householdId, householdId), eq(members.active, true)))
    .groupBy(members.id, members.name, members.avatarColor)
    .orderBy(desc(sql`coalesce(sum(${choreDefinitions.effortPoints}), 0)`));
}

