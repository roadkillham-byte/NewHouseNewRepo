import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";

export async function getHouseholdMembers(householdId: string) {
  return db
    .select()
    .from(members)
    .where(eq(members.householdId, householdId))
    .orderBy(asc(members.createdAt));
}

export async function getActiveHouseholdMemberIds(householdId: string): Promise<string[]> {
  const rows = await getHouseholdMembers(householdId);
  return rows.filter((m) => m.active).map((m) => m.id);
}
