import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  billPeriods,
  bills,
  billShares,
  choreDefinitions,
  choreInstances,
  furnitureContributions,
  furnitureItems,
  members,
} from "@/db/schema";

/**
 * Ownership checks for actions that take a bare row id.
 *
 * Server actions are public HTTP endpoints — being signed in is not the
 * same as being allowed to touch a given row. Actions that operate on a
 * *definition* (a chore, a bill, a furniture item) can scope by household
 * directly in their WHERE clause, but actions on child rows (an instance,
 * a share, a contribution) only receive the child's id, so the household
 * has to be established by walking back up to the parent.
 *
 * Without this, any signed-in user could tick off another household's
 * chores or mark their bill shares paid by passing a guessed id. That's
 * harmless while one household exists, and a real hole the moment a
 * second one does — the schema is keyed by household_id precisely so
 * that's possible.
 *
 * Each function returns true only if the row exists AND belongs to the
 * given household.
 */

export async function choreInstanceBelongsToHousehold(
  instanceId: string,
  householdId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: choreInstances.id })
    .from(choreInstances)
    .innerJoin(choreDefinitions, eq(choreInstances.definitionId, choreDefinitions.id))
    .where(and(eq(choreInstances.id, instanceId), eq(choreDefinitions.householdId, householdId)))
    .limit(1);
  return !!row;
}

export async function billPeriodBelongsToHousehold(
  periodId: string,
  householdId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: billPeriods.id })
    .from(billPeriods)
    .innerJoin(bills, eq(billPeriods.billId, bills.id))
    .where(and(eq(billPeriods.id, periodId), eq(bills.householdId, householdId)))
    .limit(1);
  return !!row;
}

export async function billShareBelongsToHousehold(
  shareId: string,
  householdId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: billShares.id })
    .from(billShares)
    .innerJoin(billPeriods, eq(billShares.periodId, billPeriods.id))
    .innerJoin(bills, eq(billPeriods.billId, bills.id))
    .where(and(eq(billShares.id, shareId), eq(bills.householdId, householdId)))
    .limit(1);
  return !!row;
}

export async function furnitureItemBelongsToHousehold(
  itemId: string,
  householdId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: furnitureItems.id })
    .from(furnitureItems)
    .where(and(eq(furnitureItems.id, itemId), eq(furnitureItems.householdId, householdId)))
    .limit(1);
  return !!row;
}

export async function furnitureContributionBelongsToHousehold(
  contributionId: string,
  householdId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: furnitureContributions.id })
    .from(furnitureContributions)
    .innerJoin(furnitureItems, eq(furnitureContributions.itemId, furnitureItems.id))
    .where(
      and(
        eq(furnitureContributions.id, contributionId),
        eq(furnitureItems.householdId, householdId),
      ),
    )
    .limit(1);
  return !!row;
}

export async function memberBelongsToHousehold(
  memberId: string,
  householdId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.householdId, householdId)))
    .limit(1);
  return !!row;
}
