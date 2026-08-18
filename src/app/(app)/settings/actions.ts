"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/db";
import { households, members } from "@/db/schema";
import { requireMemberForAction } from "@/lib/session";
import { memberBelongsToHousehold } from "@/lib/authz";
import { generateTempPassword, validatePasswordStrength } from "@/lib/password";
import { countActiveMembers } from "@/db/queries/settings";

const BCRYPT_ROUNDS = 12;

export type FormState =
  | { error?: string; fieldErrors?: Record<string, string>; success?: string }
  | undefined;

function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

function revalidateEverything() {
  // A member's name, colour or active state shows up on every page, and the
  // household's timezone changes what "today" means everywhere.
  for (const path of ["/", "/chores", "/bills", "/furniture", "/settle", "/settings"]) {
    revalidatePath(path);
  }
}

// ---------------------------------------------------------------------------
// House
// ---------------------------------------------------------------------------

const householdSchema = z.object({
  name: z.string().trim().min(1, "The house needs a name").max(120),
  timezone: z
    .string()
    .trim()
    .min(1, "Pick a timezone")
    .refine(isValidTimeZone, "That isn't a timezone this server recognises"),
});

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function updateHouseholdAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const member = await requireMemberForAction();

  const parsed = householdSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: flattenZodErrors(parsed.error) };
  }

  await db
    .update(households)
    .set({ name: parsed.data.name, timezone: parsed.data.timezone })
    .where(eq(households.id, member.householdId));

  revalidateEverything();
  return { success: "House settings saved." };
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  "#6366f1",
  "#ec4899",
  "#22c55e",
  "#f59e0b",
  "#06b6d4",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
];

const addMemberSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("That doesn't look like an email address"),
});

export type AddMemberState =
  | { error?: string; fieldErrors?: Record<string, string>; tempPassword?: string; name?: string }
  | undefined;

export async function addMemberAction(
  _prev: AddMemberState,
  formData: FormData,
): Promise<AddMemberState> {
  const member = await requireMemberForAction();

  const parsed = addMemberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: flattenZodErrors(parsed.error) };
  }
  const { name, email } = parsed.data;

  const [existing] = await db.select({ id: members.id }).from(members).where(eq(members.email, email)).limit(1);
  if (existing) {
    return { error: "Someone already has an account with that email.", fieldErrors: { email: "Already in use" } };
  }

  const existingCount = (await db.select({ id: members.id }).from(members).where(eq(members.householdId, member.householdId))).length;

  const tempPassword = generateTempPassword();
  await db.insert(members).values({
    householdId: member.householdId,
    name,
    email,
    passwordHash: await bcrypt.hash(tempPassword, BCRYPT_ROUNDS),
    avatarColor: AVATAR_COLORS[existingCount % AVATAR_COLORS.length],
    mustChangePassword: true,
  });

  revalidateEverything();
  // Returned so the UI can show it once — there's no email provider yet, so
  // whoever added them has to pass it on.
  return { tempPassword, name };
}

const updateMemberSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  avatarColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour"),
});

export async function updateMemberAction(
  memberId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireMemberForAction();
  if (!(await memberBelongsToHousehold(memberId, actor.householdId))) {
    return { error: "Not found." };
  }

  const parsed = updateMemberSchema.safeParse({
    name: formData.get("name"),
    avatarColor: formData.get("avatarColor"),
  });
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: flattenZodErrors(parsed.error) };
  }

  await db
    .update(members)
    .set({ name: parsed.data.name, avatarColor: parsed.data.avatarColor })
    .where(and(eq(members.id, memberId), eq(members.householdId, actor.householdId)));

  revalidateEverything();
  return { success: "Saved." };
}

export async function setMemberActiveAction(memberId: string, active: boolean): Promise<void> {
  const actor = await requireMemberForAction();
  if (!(await memberBelongsToHousehold(memberId, actor.householdId))) {
    throw new Error("Not found.");
  }

  if (!active) {
    // Two guards that would otherwise lock people out of their own house:
    // you can't deactivate yourself (you'd be signed out mid-action), and
    // the last active member can't be removed.
    if (memberId === actor.id) {
      throw new Error("You can't deactivate your own account.");
    }
    if ((await countActiveMembers(actor.householdId)) <= 1) {
      throw new Error("There has to be at least one active housemate.");
    }
  }

  await db
    .update(members)
    .set({ active })
    .where(and(eq(members.id, memberId), eq(members.householdId, actor.householdId)));

  revalidateEverything();
}

/** Issues a fresh temporary password for someone who's locked out. Returns it to show once. */
export async function resetMemberPasswordAction(memberId: string): Promise<string> {
  const actor = await requireMemberForAction();
  if (!(await memberBelongsToHousehold(memberId, actor.householdId))) {
    throw new Error("Not found.");
  }

  const tempPassword = generateTempPassword();
  await db
    .update(members)
    .set({ passwordHash: await bcrypt.hash(tempPassword, BCRYPT_ROUNDS), mustChangePassword: true })
    .where(and(eq(members.id, memberId), eq(members.householdId, actor.householdId)));

  revalidatePath("/settings");
  return tempPassword;
}

// ---------------------------------------------------------------------------
// Your own password
// ---------------------------------------------------------------------------

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(1, "Enter a new password"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Those two don't match",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireMemberForAction();

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: "Please fix the errors below.", fieldErrors: flattenZodErrors(parsed.error) };
  }
  const { currentPassword, newPassword } = parsed.data;

  const strength = validatePasswordStrength(newPassword);
  if (!strength.ok) {
    return { error: strength.message, fieldErrors: { newPassword: strength.message ?? "" } };
  }

  // Always changes only your own password — memberId never comes from the form.
  const [row] = await db
    .select({ passwordHash: members.passwordHash })
    .from(members)
    .where(eq(members.id, actor.id))
    .limit(1);
  if (!row) return { error: "Not found." };

  if (!(await bcrypt.compare(currentPassword, row.passwordHash))) {
    return {
      error: "That current password isn't right.",
      fieldErrors: { currentPassword: "Incorrect" },
    };
  }
  if (await bcrypt.compare(newPassword, row.passwordHash)) {
    return {
      error: "That's the password you already have.",
      fieldErrors: { newPassword: "Pick a different one" },
    };
  }

  await db
    .update(members)
    .set({ passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS), mustChangePassword: false })
    .where(eq(members.id, actor.id));

  revalidateEverything();
  return { success: "Password changed." };
}
