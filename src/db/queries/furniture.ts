import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { furnitureContributions, furnitureItems, members } from "@/db/schema";
import type { BudgetInputItem } from "@/lib/budget";

/** Every furniture item for the household, with its purchaser and contribution total joined in. */
export async function getFurnitureItems(householdId: string) {
  const items = await db
    .select({ item: furnitureItems, purchasedBy: members })
    .from(furnitureItems)
    .leftJoin(members, eq(furnitureItems.purchasedBy, members.id))
    .where(eq(furnitureItems.householdId, householdId))
    .orderBy(asc(furnitureItems.priority), asc(furnitureItems.name));

  if (items.length === 0) return [];

  const itemIds = items.map((i) => i.item.id);
  const totals = await db
    .select({
      itemId: furnitureContributions.itemId,
      totalCents: sql<number>`coalesce(sum(${furnitureContributions.amountCents}), 0)`.mapWith(Number),
    })
    .from(furnitureContributions)
    .where(inArray(furnitureContributions.itemId, itemIds))
    .groupBy(furnitureContributions.itemId);

  const totalsByItem = new Map(totals.map((t) => [t.itemId, t.totalCents]));

  return items.map((row) => ({ ...row, contributedCents: totalsByItem.get(row.item.id) ?? 0 }));
}

export type FurnitureItemRow = Awaited<ReturnType<typeof getFurnitureItems>>[number];

/** Contributions for one item, joined to the contributing member — for the item detail / contribution log. */
export async function getItemContributions(itemId: string) {
  return db
    .select({ contribution: furnitureContributions, member: members })
    .from(furnitureContributions)
    .innerJoin(members, eq(furnitureContributions.memberId, members.id))
    .where(eq(furnitureContributions.itemId, itemId))
    .orderBy(asc(furnitureContributions.createdAt));
}

/** Adapts joined furniture rows to the shape computeBudgetRollup() takes (see src/lib/budget.ts). */
export function toBudgetInput(items: FurnitureItemRow[]): BudgetInputItem[] {
  return items.map((row) => ({
    room: row.item.room,
    status: row.item.status,
    estimatedCents: row.item.estimatedCents,
    actualCents: row.item.actualCents,
  }));
}
