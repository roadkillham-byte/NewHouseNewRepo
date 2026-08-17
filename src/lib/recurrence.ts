import { RRule, type Options as RRuleOptions } from "rrule";

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

// ---------------------------------------------------------------------------
// Recurrence builder — bridges the simplified form UI to real RRULE strings
// ---------------------------------------------------------------------------

export type RecurrenceFrequency = "once" | "daily" | "weekly" | "monthly";

export interface RecurrenceInput {
  frequency: RecurrenceFrequency;
  /** Every N days/weeks/months. Defaults to 1. Ignored for "once". */
  interval?: number;
  /** 0 = Monday .. 6 = Sunday. Only meaningful (and required) for "weekly". */
  daysOfWeek?: number[];
  /** 1-31. Only meaningful for "monthly". */
  dayOfMonth?: number;
}

const WEEKDAY_BY_INDEX = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA, RRule.SU];
const WEEKDAY_STR_TO_INDEX: Record<string, number> = { MO: 0, TU: 1, WE: 2, TH: 3, FR: 4, SA: 5, SU: 6 };

/**
 * Builds an RRULE string from the simplified recurrence form. Returns null
 * for a one-off task (chore_definitions.rrule is nullable for exactly this
 * case — e.g. the move-in checklist).
 */
export function buildRRule(input: RecurrenceInput): string | null {
  if (input.frequency === "once") return null;

  const freqByFrequency: Record<Exclude<RecurrenceFrequency, "once">, RRuleOptions["freq"]> = {
    daily: RRule.DAILY,
    weekly: RRule.WEEKLY,
    monthly: RRule.MONTHLY,
  };

  const options: Partial<RRuleOptions> = {
    freq: freqByFrequency[input.frequency],
    interval: input.interval && input.interval > 0 ? input.interval : 1,
  };

  if (input.frequency === "weekly") {
    if (!input.daysOfWeek || input.daysOfWeek.length === 0) {
      throw new Error("buildRRule: weekly recurrence requires at least one day of the week");
    }
    options.byweekday = input.daysOfWeek.map((d) => {
      const weekday = WEEKDAY_BY_INDEX[d];
      if (!weekday) throw new Error(`buildRRule: invalid day-of-week index ${d}`);
      return weekday;
    });
  }

  if (input.frequency === "monthly") {
    if (!input.dayOfMonth || input.dayOfMonth < 1 || input.dayOfMonth > 31) {
      throw new Error("buildRRule: monthly recurrence requires a day of month between 1 and 31");
    }
    options.bymonthday = [input.dayOfMonth];
  }

  // No DTSTART in `options` — the app stores startDate separately
  // (chore_definitions.start_date / bills.start_date) and merges it back in
  // at expand time via expandRule(). Round-trips with RRule.parseString(),
  // which is what expandRule/validateRule/describeRule use to read it back.
  return RRule.optionsToString(options);
}

/** Inverse of buildRRule() — reconstructs form state from a stored RRULE string, to pre-fill the edit form. */
export function parseRRuleToInput(rruleString: string | null): RecurrenceInput {
  if (rruleString === null) return { frequency: "once" };

  const parsed = RRule.parseString(rruleString);
  const interval = parsed.interval ?? 1;

  if (parsed.freq === RRule.DAILY) {
    return { frequency: "daily", interval };
  }

  if (parsed.freq === RRule.MONTHLY) {
    const days = toArray(parsed.bymonthday);
    return { frequency: "monthly", interval, dayOfMonth: days[0] };
  }

  // Weekly (and anything else we don't offer a dedicated builder path for)
  // falls back to weekly, since that's the only mode BYDAY applies to here.
  const weekdays = toArray(parsed.byweekday).map((wd) => {
    if (typeof wd === "number") return wd;
    if (typeof wd === "string") return WEEKDAY_STR_TO_INDEX[wd];
    return wd.weekday;
  });
  return { frequency: "weekly", interval, daysOfWeek: weekdays };
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
