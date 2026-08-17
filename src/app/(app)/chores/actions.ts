"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { choreDefinitions, choreInstances } from "@/db/schema";
import { auth } from "@/lib/auth";
import { buildRRule } from "@/lib/recurrence";
import { materialiseChoresForHousehold } from "@/lib/materialise";
import { houseToday } from "@/lib/today";
import { choreInstanceBelongsToHousehold } from "@/lib/authz";

const choreFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    notes: z.string().trim().max(2000).optional(),
    area: z.string().trim().max(100).optional(),
    startDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Pick a valid start date"),
    effortPoints: z.coerce.number().int().min(1).max(20),
    rotationStrategy: z.enum(["round_robin", "fixed"]),
    fixedAssigneeId: z.string().trim().optional(),
    frequency: z.enum(["once", "daily", "weekly", "monthly"]),
    interval: z.coerce.number().int().min(1).max(30).optional(),
    daysOfWeek: z.array(z.coerce.number().int().min(0).max(6)).optional(),
    dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  })
  .refine((data) => data.rotationStrategy !== "fixed" || !!data.fixedAssigneeId, {
    message: "Choose who this chore is fixed to",
    path: ["fixedAssigneeId"],
  })
  .refine((data) => data.frequency !== "weekly" || (data.daysOfWeek && data.daysOfWeek.length > 0), {
    message: "Choose at least one day of the week",
    path: ["daysOfWeek"],
  })
  .refine((data) => data.frequency !== "monthly" || !!data.dayOfMonth, {
    message: "Choose a day of the month",
    path: ["dayOfMonth"],
  });

export type ChoreFormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

function parseChoreForm(formData: FormData) {
  return choreFormSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes") || undefined,
    area: formData.get("area") || undefined,
    startDate: formData.get("startDate"),
    effortPoints: formData.get("effortPoints"),
    rotationStrategy: formData.get("rotationStrategy"),
    fixedAssigneeId: formData.get("fixedAssigneeId") || undefined,
    frequency: formData.get("frequency"),
    interval: formData.get("interval") || undefined,
    daysOfWeek: formData.getAll("daysOfWeek"),
    dayOfMonth: formData.get("dayOfMonth") || undefined,
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

export async function createChoreAction(
  _prev: ChoreFormState,
  formData: FormData,
): Promise<ChoreFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const parsed = parseChoreForm(formData);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: flattenZodErrors(parsed.error) };
  }
  const data = parsed.data;

  let rrule: string | null;
  try {
    rrule = buildRRule({
      frequency: data.frequency,
      interval: data.interval,
      daysOfWeek: data.daysOfWeek,
      dayOfMonth: data.dayOfMonth,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid recurrence." };
  }

  await db.insert(choreDefinitions).values({
    householdId: session.user.householdId,
    title: data.title,
    notes: data.notes || null,
    area: data.area || null,
    rrule,
    startDate: new Date(data.startDate),
    effortPoints: data.effortPoints,
    rotationStrategy: data.rotationStrategy,
    fixedAssigneeId: data.rotationStrategy === "fixed" ? (data.fixedAssigneeId ?? null) : null,
  });

  await materialiseChoresForHousehold(session.user.householdId);
  revalidatePath("/chores");
}

export async function updateChoreAction(
  choreId: string,
  _prev: ChoreFormState,
  formData: FormData,
): Promise<ChoreFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const parsed = parseChoreForm(formData);
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: flattenZodErrors(parsed.error) };
  }
  const data = parsed.data;

  let rrule: string | null;
  try {
    rrule = buildRRule({
      frequency: data.frequency,
      interval: data.interval,
      daysOfWeek: data.daysOfWeek,
      dayOfMonth: data.dayOfMonth,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid recurrence." };
  }

  await db
    .update(choreDefinitions)
    .set({
      title: data.title,
      notes: data.notes || null,
      area: data.area || null,
      rrule,
      startDate: new Date(data.startDate),
      effortPoints: data.effortPoints,
      rotationStrategy: data.rotationStrategy,
      fixedAssigneeId: data.rotationStrategy === "fixed" ? (data.fixedAssigneeId ?? null) : null,
    })
    .where(
      and(eq(choreDefinitions.id, choreId), eq(choreDefinitions.householdId, session.user.householdId)),
    );

  // The schedule may have changed. Clear out not-yet-happened *pending*
  // instances so the old schedule doesn't linger alongside the new one —
  // but never touch anything already done or skipped; that's real history.
  await clearFuturePendingInstances(choreId);
  await materialiseChoresForHousehold(session.user.householdId);
  revalidatePath("/chores");
}

export async function setChoreActiveAction(choreId: string, active: boolean): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in.");

  await db
    .update(choreDefinitions)
    .set({ active })
    .where(
      and(eq(choreDefinitions.id, choreId), eq(choreDefinitions.householdId, session.user.householdId)),
    );

  if (active) {
    await materialiseChoresForHousehold(session.user.householdId);
  } else {
    // Deactivating: stop showing it as due going forward, but keep history.
    await clearFuturePendingInstances(choreId);
  }
  revalidatePath("/chores");
}

async function clearFuturePendingInstances(definitionId: string): Promise<void> {
  const today = houseToday();
  await db
    .delete(choreInstances)
    .where(
      and(
        eq(choreInstances.definitionId, definitionId),
        gte(choreInstances.dueDate, today),
        eq(choreInstances.status, "pending"),
      ),
    );
}

/**
 * Instance actions receive only the instance id, so the household has to be
 * established by walking up to the definition — see src/lib/authz.ts.
 * `revalidatePath` covers both surfaces these are called from: the chores
 * page and the dashboard.
 */
async function requireOwnedInstance(instanceId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in.");
  if (!(await choreInstanceBelongsToHousehold(instanceId, session.user.householdId))) {
    throw new Error("Not found.");
  }
}

export async function completeInstanceAction(instanceId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in.");
  if (!(await choreInstanceBelongsToHousehold(instanceId, session.user.householdId))) {
    throw new Error("Not found.");
  }

  await db
    .update(choreInstances)
    .set({ status: "done", completedAt: new Date(), completedBy: session.user.id })
    .where(eq(choreInstances.id, instanceId));
  revalidatePath("/chores");
  revalidatePath("/");
}

export async function uncompleteInstanceAction(instanceId: string): Promise<void> {
  await requireOwnedInstance(instanceId);

  await db
    .update(choreInstances)
    .set({ status: "pending", completedAt: null, completedBy: null })
    .where(eq(choreInstances.id, instanceId));
  revalidatePath("/chores");
  revalidatePath("/");
}

export async function skipInstanceAction(instanceId: string): Promise<void> {
  await requireOwnedInstance(instanceId);

  await db
    .update(choreInstances)
    .set({ status: "skipped" })
    .where(eq(choreInstances.id, instanceId));
  revalidatePath("/chores");
  revalidatePath("/");
}
