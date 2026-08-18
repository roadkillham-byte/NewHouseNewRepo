import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";

/**
 * Login rate limiting, backed by Postgres rather than memory.
 *
 * An in-memory counter is worse than none on a serverless host: each
 * instance keeps its own tally, so an attacker spreading requests across
 * cold starts never trips it, while a housemate unlucky enough to keep
 * hitting the same warm instance does. The table costs one small query per
 * sign-in attempt, which is nothing next to the bcrypt compare that
 * follows.
 *
 * Keyed on email only. Adding IP sounds stricter but mostly punishes a
 * house behind one NAT — four people on the same wifi share an address —
 * and does nothing against a distributed attacker.
 */

export const MAX_FAILED_ATTEMPTS = 5;
export const WINDOW_MINUTES = 15;
const RETENTION_DAYS = 7;

/** True when this email has burnt through its attempts and should be refused without checking the password. */
export async function isRateLimited(email: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);

  const [row] = await db
    .select({ failures: sql<number>`count(*)`.mapWith(Number) })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, email.toLowerCase()),
        eq(loginAttempts.succeeded, false),
        gte(loginAttempts.attemptedAt, since),
      ),
    );

  return (row?.failures ?? 0) >= MAX_FAILED_ATTEMPTS;
}

/**
 * Records an attempt. A success clears the recent failures for that email,
 * so getting in resets your budget rather than leaving you one typo away
 * from a lockout you already proved you didn't deserve.
 */
export async function recordLoginAttempt(email: string, succeeded: boolean): Promise<void> {
  const normalised = email.toLowerCase();
  await db.insert(loginAttempts).values({ email: normalised, succeeded });

  if (succeeded) {
    await db
      .delete(loginAttempts)
      .where(and(eq(loginAttempts.email, normalised), eq(loginAttempts.succeeded, false)));
  }
}

/** Drops attempts older than the retention window. Called from the daily cron route. */
export async function pruneLoginAttempts(): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60_000);
  const deleted = await db
    .delete(loginAttempts)
    .where(lt(loginAttempts.attemptedAt, cutoff))
    .returning({ id: loginAttempts.id });
  return deleted.length;
}
