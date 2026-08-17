import { RRule } from "rrule";

/**
 * Expands an RFC 5545 RRULE string into the due dates that fall within
 * [windowStart, windowEnd] (inclusive), anchored at `startDate` (the DTSTART
 * — the first date the rule applies from).
 *
 * Used by the daily materialise job to generate chore_instances and
 * bill_periods a rolling window ahead of time, and by the calendar view to
 * preview a rule before saving it.
 */
export function expandRule(
  rruleString: string,
  startDate: Date,
  windowStart: Date,
  windowEnd: Date,
): Date[] {
  if (windowEnd < windowStart) {
    throw new Error("expandRule: windowEnd is before windowStart");
  }

  // RRule works in UTC internally when given a UTC dtstart; we normalise
  // every date to midnight UTC so day-of-week/month math (BYDAY, BYMONTHDAY)
  // isn't shifted by the server's local timezone.
  const dtstart = toUtcMidnight(startDate);
  const rule = new RRule({
    ...RRule.parseString(rruleString),
    dtstart,
  });

  const occurrences = rule.between(toUtcMidnight(windowStart), toUtcMidnight(windowEnd), true);
  return occurrences;
}

/** Validate an RRULE string without expanding it. Throws with a readable message on failure. */
export function validateRule(rruleString: string): void {
  RRule.parseString(rruleString);
}

/** Human-readable summary of a rule, e.g. "Weekly on Monday". Used in the recurrence builder UI. */
export function describeRule(rruleString: string, startDate: Date): string {
  const dtstart = toUtcMidnight(startDate);
  const rule = new RRule({ ...RRule.parseString(rruleString), dtstart });
  return rule.toText();
}

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// ---------------------------------------------------------------------------
// Round-robin assignment
// ---------------------------------------------------------------------------

export interface RotationMember {
  id: string;
  active: boolean;
}

/**
 * Picks the next assignee for a round-robin chore.
 *
 * `orderedMembers` is the household's canonical member order (e.g. by
 * creation date) — this is the rotation sequence. `lastAssigneeId` is who
 * did it last time (or null if this chore has never been assigned).
 *
 * Rules:
 * - No history: the first active member in canonical order.
 * - Otherwise: the next active member after `lastAssigneeId` in canonical
 *   order, wrapping around. Inactive members are skipped entirely — they
 *   neither receive the chore nor break the cycle for others.
 * - If `lastAssigneeId` no longer appears in `orderedMembers` (removed from
 *   the household), rotation resumes from the front.
 */
export function nextRoundRobinAssignee(
  orderedMembers: RotationMember[],
  lastAssigneeId: string | null,
): string {
  const active = orderedMembers.filter((m) => m.active);
  if (active.length === 0) {
    throw new Error("nextRoundRobinAssignee: no active members to assign to");
  }

  if (lastAssigneeId === null) {
    return active[0].id;
  }

  const lastIndex = orderedMembers.findIndex((m) => m.id === lastAssigneeId);
  if (lastIndex === -1) {
    return active[0].id;
  }

  // Walk forward through the full (including inactive) list starting just
  // after the last assignee, and return the first active member found —
  // this preserves the canonical ordering rather than only ever cycling
  // through whichever members happen to be active right now.
  for (let offset = 1; offset <= orderedMembers.length; offset++) {
    const candidate = orderedMembers[(lastIndex + offset) % orderedMembers.length];
    if (candidate.active) {
      return candidate.id;
    }
  }

  // Unreachable: `active.length > 0` guarantees the loop above returns.
  throw new Error("nextRoundRobinAssignee: unreachable");
}
