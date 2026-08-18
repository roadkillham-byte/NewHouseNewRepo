import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { households, members } from "@/db/schema";

export async function getHousehold(householdId: string) {
  const [row] = await db.select().from(households).where(eq(households.id, householdId)).limit(1);
  return row ?? null;
}

/**
 * The household's IANA timezone. Every "today" in the app resolves through
 * this — see houseToday() in src/lib/today.ts.
 */
export async function getHouseholdTimezone(householdId: string): Promise<string> {
  const [row] = await db
    .select({ timezone: households.timezone })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);
  return row?.timezone ?? process.env.HOUSE_TIMEZONE ?? "Australia/Sydney";
}

/** Everyone in the house, active first, then by join order. Includes inactive members so they can be reactivated. */
export async function getMembersForSettings(householdId: string) {
  return db
    .select({
      id: members.id,
      name: members.name,
      email: members.email,
      avatarColor: members.avatarColor,
      active: members.active,
      mustChangePassword: members.mustChangePassword,
      createdAt: members.createdAt,
    })
    .from(members)
    .where(eq(members.householdId, householdId))
    .orderBy(asc(members.createdAt));
}

export type SettingsMemberRow = Awaited<ReturnType<typeof getMembersForSettings>>[number];

/** How many members are still active — used to refuse deactivating the last one. */
export async function countActiveMembers(householdId: string): Promise<number> {
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.householdId, householdId), eq(members.active, true)));
  return rows.length;
}
