import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { choreDefinitions, choreInstances, members } from "@/db/schema";
import { expandRule, nextRoundRobinAssignee, type RotationMember } from "./recurrence";
import { addUtcDays, houseToday } from "./today";
import { getHouseholdTimezone } from "@/db/queries/settings";

export const MATERIALISE_WINDOW_DAYS = 60;

type ChoreDefinitionRow = typeof choreDefinitions.$inferSelect;

/**
 * Materialises chore_instances for one household: for every active chore
 * definition, ensures an instance exists for each due date between today
 * and `windowDays` out (recurring), or a single instance at its start date
 * (one-off — rrule is null, used for the move-in checklist).
 *
 * Idempotent and safe to re-run: the (definition_id, due_date) unique index
 * means an instance that already exists is never duplicated, and
 * round-robin state is re-derived from the most recent existing instance
 * each run rather than stored anywhere separately.
 */
export async function materialiseChoresForHousehold(
  householdId: string,
  windowDays: number = MATERIALISE_WINDOW_DAYS,
): Promise<{ definitionsProcessed: number; instancesCreated: number }> {
  const today = houseToday(new Date(), await getHouseholdTimezone(householdId));
  const windowEnd = addUtcDays(today, windowDays);

  const definitions = await db
    .select()
    .from(choreDefinitions)
    .where(and(eq(choreDefinitions.householdId, householdId), eq(choreDefinitions.active, true)));

  const householdMembers: RotationMember[] = await db
    .select({ id: members.id, active: members.active })
    .from(members)
    .where(eq(members.householdId, householdId))
    .orderBy(members.createdAt);

  let instancesCreated = 0;

  for (const definition of definitions) {
    if (definition.rrule === null) {
      instancesCreated += await materialiseOneOff(definition, householdMembers);
      continue;
    }
    instancesCreated += await materialiseRecurring(definition, householdMembers, today, windowEnd);
  }

  return { definitionsProcessed: definitions.length, instancesCreated };
}

async function materialiseOneOff(
  definition: ChoreDefinitionRow,
  householdMembers: RotationMember[],
): Promise<number> {
  const [existing] = await db
    .select({ id: choreInstances.id })
    .from(choreInstances)
    .where(eq(choreInstances.definitionId, definition.id))
    .limit(1);
  if (existing) return 0;

  const assigneeId = resolveAssignee(definition, householdMembers, null);
  await db
    .insert(choreInstances)
    .values({ definitionId: definition.id, dueDate: definition.startDate, assigneeId })
    .onConflictDoNothing();
  return 1;
}

async function materialiseRecurring(
  definition: ChoreDefinitionRow,
  householdMembers: RotationMember[],
  windowStart: Date,
  windowEnd: Date,
): Promise<number> {
  // rrule is guaranteed non-null by the caller.
  const dueDates = expandRule(definition.rrule as string, definition.startDate, windowStart, windowEnd);
  if (dueDates.length === 0) return 0;

  const existing = await db
    .select({ dueDate: choreInstances.dueDate })
    .from(choreInstances)
    .where(
      and(eq(choreInstances.definitionId, definition.id), gte(choreInstances.dueDate, windowStart)),
    );
  const existingDueDates = new Set(existing.map((row) => isoDate(row.dueDate)));
  const missingDates = dueDates.filter((d) => !existingDueDates.has(isoDate(d)));
  if (missingDates.length === 0) return 0;

  let lastAssigneeId = await getLastAssigneeId(definition.id);
  let created = 0;

  for (const dueDate of missingDates) {
    const assigneeId = resolveAssignee(definition, householdMembers, lastAssigneeId);
    const [inserted] = await db
      .insert(choreInstances)
      .values({ definitionId: definition.id, dueDate, assigneeId })
      .onConflictDoNothing()
      .returning({ id: choreInstances.id });

    if (inserted) {
      created++;
      if (definition.rotationStrategy === "round_robin" && assigneeId) {
        lastAssigneeId = assigneeId;
      }
    }
  }

  return created;
}

function resolveAssignee(
  definition: ChoreDefinitionRow,
  householdMembers: RotationMember[],
  lastAssigneeId: string | null,
): string | null {
  if (definition.rotationStrategy === "fixed") {
    return definition.fixedAssigneeId;
  }
  if (!householdMembers.some((m) => m.active)) {
    // No one active to assign to — leave unassigned rather than fail the
    // whole materialise run for every other definition too.
    return null;
  }
  return nextRoundRobinAssignee(householdMembers, lastAssigneeId);
}

async function getLastAssigneeId(definitionId: string): Promise<string | null> {
  const [last] = await db
    .select({ assigneeId: choreInstances.assigneeId })
    .from(choreInstances)
    .where(eq(choreInstances.definitionId, definitionId))
    .orderBy(desc(choreInstances.dueDate))
    .limit(1);
  return last?.assigneeId ?? null;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
