import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ledgerEntries, members } from "@/db/schema";
import type { LedgerParticipant } from "@/lib/settlement";

/**
 * Total each active member has actually paid in, from ledger_entries — the
 * single source of truth spanning both bill payments and furniture
 * contributions. Members who've paid nothing still appear (with 0), because
 * they're part of the split and therefore owe.
 */
export async function getLedgerParticipants(householdId: string): Promise<LedgerParticipant[]> {
  const rows = await db
    .select({
      memberId: members.id,
      name: members.name,
      paidCents: sql<number>`coalesce(sum(${ledgerEntries.amountCents}), 0)`.mapWith(Number),
    })
    .from(members)
    .leftJoin(ledgerEntries, eq(ledgerEntries.memberId, members.id))
    .where(and(eq(members.householdId, householdId), eq(members.active, true)))
    .groupBy(members.id, members.name, members.createdAt)
    .orderBy(asc(members.createdAt));

  return rows;
}

/** The raw ledger, newest first, for the "how was this calculated" detail view. */
export async function getLedgerEntries(householdId: string, limit = 50) {
  return db
    .select({ entry: ledgerEntries, member: members })
    .from(ledgerEntries)
    .innerJoin(members, eq(ledgerEntries.memberId, members.id))
    .where(eq(ledgerEntries.householdId, householdId))
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(limit);
}

export type LedgerEntryRow = Awaited<ReturnType<typeof getLedgerEntries>>[number];
