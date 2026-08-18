"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { bills, billPeriods, billShares, ledgerEntries } from "@/db/schema";
import { requireMemberForAction } from "@/lib/session";
import { buildRRule } from "@/lib/recurrence";
import { parseMoney } from "@/lib/money";
import { houseToday } from "@/lib/today";
import { billPeriodBelongsToHousehold, billShareBelongsToHousehold } from "@/lib/authz";
import { materialiseBillsForHousehold, createEvenShares } from "@/lib/materialise-bills";
import { getActiveHouseholdMemberIds } from "@/db/queries/household";

const billFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    vendor: z.string().trim().max(200).optional(),
    category: z.string().trim().max(100).optional(),
    startDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Pick a valid start date"),
    frequency: z.enum(["daily", "weekly", "monthly"]),
    interval: z.coerce.number().int().min(1).max(30).optional(),
    daysOfWeek: z.array(z.coerce.number().int().min(0).max(6)).optional(),
    dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
    amountMode: z.enum(["fixed", "variable"]),
    defaultAmount: z.string().optional(),
  })
  .refine((data) => data.frequency !== "weekly" || (data.daysOfWeek && data.daysOfWeek.length > 0), {
    message: "Choose at least one day of the week",
    path: ["daysOfWeek"],
  })
  .refine((data) => data.frequency !== "monthly" || !!data.dayOfMonth, {
    message: "Choose a day of the month",
    path: ["dayOfMonth"],
  })
  .refine((data) => data.amountMode !== "fixed" || !!data.defaultAmount, {
    message: "Enter the amount",
    path: ["defaultAmount"],
  });

export type BillFormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

function parseBillForm(formData: FormData) {
  return billFormSchema.safeParse({
    name: formData.get("name"),
    vendor: formData.get("vendor") || undefined,
    category: formData.get("category") || undefined,
    startDate: formData.get("startDate"),
    frequency: formData.get("frequency"),
    interval: formData.get("interval") || undefined,
    daysOfWeek: formData.getAll("daysOfWeek"),
    dayOfMonth: formData.get("dayOfMonth") || undefined,
    amountMode: formData.get("amountMode"),
    defaultAmount: formData.get("defaultAmount") || undefined,
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

export async function createBillAction(
  _prev: BillFormState,
  formData: FormData,
): Promise<BillFormState> {
  const member = await requireMemberForAction();

  const parsed = parseBillForm(formData);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: flattenZodErrors(parsed.error) };
  }
  const data = parsed.data;

  let rrule: string | null;
  let defaultAmountCents: number | null = null;
  try {
    rrule = buildRRule({
      frequency: data.frequency,
      interval: data.interval,
      daysOfWeek: data.daysOfWeek,
      dayOfMonth: data.dayOfMonth,
    });
    if (data.amountMode === "fixed" && data.defaultAmount) {
      defaultAmountCents = parseMoney(data.defaultAmount);
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid input." };
  }

  await db.insert(bills).values({
    householdId: member.householdId,
    name: data.name,
    vendor: data.vendor || null,
    category: data.category || null,
    rrule: rrule as string, // frequency excludes "once" for bills, so never null
    startDate: new Date(data.startDate),
    amountMode: data.amountMode,
    defaultAmountCents,
    splitRule: "even",
  });

  await materialiseBillsForHousehold(member.householdId);
  revalidatePath("/bills");
}

export async function updateBillAction(
  billId: string,
  _prev: BillFormState,
  formData: FormData,
): Promise<BillFormState> {
  const member = await requireMemberForAction();

  const parsed = parseBillForm(formData);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: flattenZodErrors(parsed.error) };
  }
  const data = parsed.data;

  let rrule: string | null;
  let defaultAmountCents: number | null = null;
  try {
    rrule = buildRRule({
      frequency: data.frequency,
      interval: data.interval,
      daysOfWeek: data.daysOfWeek,
      dayOfMonth: data.dayOfMonth,
    });
    if (data.amountMode === "fixed" && data.defaultAmount) {
      defaultAmountCents = parseMoney(data.defaultAmount);
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid input." };
  }

  await db
    .update(bills)
    .set({
      name: data.name,
      vendor: data.vendor || null,
      category: data.category || null,
      rrule: rrule as string,
      startDate: new Date(data.startDate),
      amountMode: data.amountMode,
      defaultAmountCents,
    })
    .where(and(eq(bills.id, billId), eq(bills.householdId, member.householdId)));

  // Same principle as chores: never touch a period that already has a paid
  // share (real payment history), but future periods that are still
  // completely unpaid get dropped and rebuilt against the new schedule/amount.
  await clearFutureUnsettledPeriods(billId, member.householdTimezone);
  await materialiseBillsForHousehold(member.householdId);
  revalidatePath("/bills");
}

export async function setBillActiveAction(billId: string, active: boolean): Promise<void> {
  const member = await requireMemberForAction();

  await db
    .update(bills)
    .set({ active })
    .where(and(eq(bills.id, billId), eq(bills.householdId, member.householdId)));

  if (active) {
    await materialiseBillsForHousehold(member.householdId);
  } else {
    await clearFutureUnsettledPeriods(billId, member.householdTimezone);
  }
  revalidatePath("/bills");
}

async function clearFutureUnsettledPeriods(billId: string, timeZone: string): Promise<void> {
  const today = houseToday(new Date(), timeZone);
  const candidates = await db
    .select({ id: billPeriods.id })
    .from(billPeriods)
    .where(and(eq(billPeriods.billId, billId), gte(billPeriods.dueDate, today)));

  for (const candidate of candidates) {
    const [paidShare] = await db
      .select({ id: billShares.id })
      .from(billShares)
      .where(and(eq(billShares.periodId, candidate.id), isNotNull(billShares.paidAt)))
      .limit(1);
    if (!paidShare) {
      // Cascades to bill_shares via the FK's onDelete: "cascade".
      await db.delete(billPeriods).where(eq(billPeriods.id, candidate.id));
    }
  }
}

const amountFormSchema = z.object({ amount: z.string().min(1, "Enter an amount") });

export type SetAmountState = { error?: string } | undefined;

export async function setBillPeriodAmountAction(
  periodId: string,
  _prev: SetAmountState,
  formData: FormData,
): Promise<SetAmountState> {
  const member = await requireMemberForAction();
  if (!(await billPeriodBelongsToHousehold(periodId, member.householdId))) {
    return { error: "Not found." };
  }

  const parsed = amountFormSchema.safeParse({ amount: formData.get("amount") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid amount." };

  let amountCents: number;
  try {
    amountCents = parseMoney(parsed.data.amount);
  } catch {
    return { error: "Enter a valid dollar amount." };
  }

  await db.update(billPeriods).set({ totalCents: amountCents }).where(eq(billPeriods.id, periodId));

  const memberIds = await getActiveHouseholdMemberIds(member.householdId);
  if (memberIds.length > 0) {
    await createEvenShares(periodId, amountCents, memberIds);
  }

  revalidatePath("/bills");
}

export async function markSharePaidAction(shareId: string): Promise<void> {
  const member = await requireMemberForAction();
  if (!(await billShareBelongsToHousehold(shareId, member.householdId))) {
    throw new Error("Not found.");
  }

  const [share] = await db.select().from(billShares).where(eq(billShares.id, shareId)).limit(1);
  if (!share || share.paidAt) return; // already paid or missing — nothing to do

  await db
    .update(billShares)
    .set({ paidAt: new Date(), markedBy: member.id })
    .where(eq(billShares.id, shareId));

  await db.insert(ledgerEntries).values({
    householdId: member.householdId,
    memberId: share.memberId,
    type: "bill_payment",
    amountCents: share.amountOwedCents,
    sourceId: share.id,
    note: null,
  });

  revalidatePath("/bills");
  revalidatePath("/");
  revalidatePath("/settle");
}

export async function unmarkSharePaidAction(shareId: string): Promise<void> {
  const member = await requireMemberForAction();
  if (!(await billShareBelongsToHousehold(shareId, member.householdId))) {
    throw new Error("Not found.");
  }

  await db
    .update(billShares)
    .set({ paidAt: null, markedBy: null })
    .where(eq(billShares.id, shareId));

  await db
    .delete(ledgerEntries)
    .where(and(eq(ledgerEntries.type, "bill_payment"), eq(ledgerEntries.sourceId, shareId)));

  revalidatePath("/bills");
  revalidatePath("/");
  revalidatePath("/settle");
}
