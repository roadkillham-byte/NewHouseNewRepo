"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { furnitureContributions, furnitureItems, ledgerEntries } from "@/db/schema";
import { auth } from "@/lib/auth";
import { parseMoney } from "@/lib/money";
import {
  furnitureContributionBelongsToHousehold,
  furnitureItemBelongsToHousehold,
} from "@/lib/authz";

const itemFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  room: z.string().trim().max(100).optional(),
  status: z.enum(["needed", "researching", "ordered", "owned"]),
  priority: z.coerce.number().int().min(1).max(3),
  estimatedAmount: z.string().optional(),
  actualAmount: z.string().optional(),
  url: z.string().trim().max(2000).optional(),
  fundingSource: z.enum(["house", "individual"]),
});

export type ItemFormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

function parseItemForm(formData: FormData) {
  return itemFormSchema.safeParse({
    name: formData.get("name"),
    room: formData.get("room") || undefined,
    status: formData.get("status"),
    priority: formData.get("priority"),
    estimatedAmount: formData.get("estimatedAmount") || undefined,
    actualAmount: formData.get("actualAmount") || undefined,
    url: formData.get("url") || undefined,
    fundingSource: formData.get("fundingSource"),
  });
}

function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

function parseOptionalMoney(value: string | undefined, field: string): number | null {
  if (!value) return null;
  try {
    return parseMoney(value);
  } catch {
    throw new FormValidationError(field, `Enter a valid dollar amount for ${field}.`);
  }
}

class FormValidationError extends Error {
  constructor(
    public field: string,
    message: string,
  ) {
    super(message);
  }
}

export async function createItemAction(
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const parsed = parseItemForm(formData);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: flattenZodErrors(parsed.error) };
  }
  const data = parsed.data;

  let estimatedCents: number | null;
  let actualCents: number | null;
  try {
    estimatedCents = parseOptionalMoney(data.estimatedAmount, "estimatedAmount");
    actualCents = parseOptionalMoney(data.actualAmount, "actualAmount");
  } catch (error) {
    if (error instanceof FormValidationError) {
      return { error: error.message, fieldErrors: { [error.field]: error.message } };
    }
    throw error;
  }

  await db.insert(furnitureItems).values({
    householdId: session.user.householdId,
    name: data.name,
    room: data.room || null,
    status: data.status,
    priority: data.priority,
    estimatedCents,
    actualCents,
    url: data.url || null,
    fundingSource: data.fundingSource,
    // Added as already-owned: record who bought it, so the settle-up panel
    // can say who the others owe. (An item created as needed/researching/
    // ordered gets its purchaser when it's advanced to owned instead.)
    purchasedBy: data.status === "owned" ? session.user.id : null,
  });

  revalidatePath("/furniture");
}

export async function updateItemAction(
  itemId: string,
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const parsed = parseItemForm(formData);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: flattenZodErrors(parsed.error) };
  }
  const data = parsed.data;

  let estimatedCents: number | null;
  let actualCents: number | null;
  try {
    estimatedCents = parseOptionalMoney(data.estimatedAmount, "estimatedAmount");
    actualCents = parseOptionalMoney(data.actualAmount, "actualAmount");
  } catch (error) {
    if (error instanceof FormValidationError) {
      return { error: error.message, fieldErrors: { [error.field]: error.message } };
    }
    throw error;
  }

  const [existing] = await db
    .select({ purchasedBy: furnitureItems.purchasedBy })
    .from(furnitureItems)
    .where(
      and(eq(furnitureItems.id, itemId), eq(furnitureItems.householdId, session.user.householdId)),
    )
    .limit(1);

  await db
    .update(furnitureItems)
    .set({
      name: data.name,
      room: data.room || null,
      status: data.status,
      priority: data.priority,
      estimatedCents,
      actualCents,
      url: data.url || null,
      fundingSource: data.fundingSource,
      // Becoming owned via the edit form records the purchaser, but never
      // overwrites one already recorded — the person editing an item isn't
      // necessarily the person who paid for it. Moving back out of "owned"
      // clears it, so a re-purchase attributes correctly.
      purchasedBy:
        data.status === "owned"
          ? (existing?.purchasedBy ?? session.user.id)
          : null,
    })
    .where(
      and(eq(furnitureItems.id, itemId), eq(furnitureItems.householdId, session.user.householdId)),
    );

  revalidatePath("/furniture");
}

export async function setItemStatusAction(itemId: string, status: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in.");

  const parsedStatus = z.enum(["needed", "researching", "ordered", "owned"]).parse(status);

  const [existing] = await db
    .select({ purchasedBy: furnitureItems.purchasedBy })
    .from(furnitureItems)
    .where(
      and(eq(furnitureItems.id, itemId), eq(furnitureItems.householdId, session.user.householdId)),
    )
    .limit(1);

  await db
    .update(furnitureItems)
    .set({
      status: parsedStatus,
      // Same rule as the edit form: record the purchaser on the way into
      // "owned" without clobbering an existing one, and clear it on the way
      // out. Written explicitly rather than left `undefined` — `undefined`
      // means "don't touch this column" in Drizzle, which would strand a
      // stale purchaser on an item moved back to needed/researching.
      purchasedBy:
        parsedStatus === "owned" ? (existing?.purchasedBy ?? session.user.id) : null,
    })
    .where(
      and(eq(furnitureItems.id, itemId), eq(furnitureItems.householdId, session.user.householdId)),
    );

  revalidatePath("/furniture");
}

const contributionFormSchema = z.object({ amount: z.string().min(1, "Enter an amount") });

export type ContributionFormState = { error?: string } | undefined;

export async function addContributionAction(
  itemId: string,
  _prev: ContributionFormState,
  formData: FormData,
): Promise<ContributionFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  if (!(await furnitureItemBelongsToHousehold(itemId, session.user.householdId))) {
    return { error: "Not found." };
  }

  const parsed = contributionFormSchema.safeParse({ amount: formData.get("amount") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid amount." };

  let amountCents: number;
  try {
    amountCents = parseMoney(parsed.data.amount);
  } catch {
    return { error: "Enter a valid dollar amount." };
  }

  const [contribution] = await db
    .insert(furnitureContributions)
    .values({ itemId, memberId: session.user.id, amountCents })
    .returning();

  await db.insert(ledgerEntries).values({
    householdId: session.user.householdId,
    memberId: session.user.id,
    type: "furniture_contribution",
    amountCents,
    sourceId: contribution.id,
    note: null,
  });

  revalidatePath("/furniture");
  revalidatePath("/settle");
}

export async function removeContributionAction(contributionId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in.");
  if (!(await furnitureContributionBelongsToHousehold(contributionId, session.user.householdId))) {
    throw new Error("Not found.");
  }

  await db.delete(furnitureContributions).where(eq(furnitureContributions.id, contributionId));
  await db
    .delete(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.type, "furniture_contribution"),
        eq(ledgerEntries.sourceId, contributionId),
      ),
    );

  revalidatePath("/furniture");
  revalidatePath("/settle");
}
