import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { households, members } from "@/db/schema";
import { auth } from "./auth";

/**
 * The signed-in member, read fresh from the database on every call.
 *
 * Sessions are JWTs, and the token is only written at sign-in. Anything
 * mutable that lives in the token therefore goes stale: a renamed member
 * keeps their old name in the header until they sign out, and — the reason
 * this helper exists — deactivating a housemate who has moved out would
 * *not* log them out, because `active` is only checked in `authorize()`
 * and their token stays valid for weeks.
 *
 * So the token carries only immutable identity (`id`, `householdId`) and
 * everything else is read per request. That costs one query per request,
 * which is irrelevant at four users and is the only way deactivation takes
 * effect immediately.
 *
 * Note this is deliberately *not* used by `proxy.ts` — that runs ahead of
 * the app on every request and must stay free of database imports. Proxy
 * only checks that a session cookie decodes; this is the real check.
 */

export interface CurrentMember {
  id: string;
  householdId: string;
  name: string;
  email: string;
  avatarColor: string;
  mustChangePassword: boolean;
  householdName: string;
  householdTimezone: string;
}

/** Returns the current member, or null if not signed in / no longer active. */
export async function getCurrentMember(): Promise<CurrentMember | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [row] = await db
    .select({
      id: members.id,
      householdId: members.householdId,
      name: members.name,
      email: members.email,
      avatarColor: members.avatarColor,
      mustChangePassword: members.mustChangePassword,
      householdName: households.name,
      householdTimezone: households.timezone,
    })
    .from(members)
    .innerJoin(households, eq(members.householdId, households.id))
    .where(and(eq(members.id, session.user.id), eq(members.active, true)))
    .limit(1);

  return row ?? null;
}

/**
 * Same, but redirects to /login when there's no active member. Use this in
 * pages and layouts.
 */
export async function requireMember(): Promise<CurrentMember> {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  return member;
}

/**
 * Same, but throws instead of redirecting. Use this in server actions —
 * redirecting out of an action gives a confusing half-state, and the
 * client already handles a thrown error.
 */
export async function requireMemberForAction(): Promise<CurrentMember> {
  const member = await getCurrentMember();
  if (!member) throw new Error("Not signed in.");
  return member;
}
