/**
 * "Today" for the household.
 *
 * Every date column in the schema is a date-only value, stored as UTC
 * midnight. The naive way to get today — `startOfUtcDay(new Date())` —
 * takes the *server's* UTC date, which is wrong for any household not
 * living in UTC. Deployed on Vercel (UTC) for a Sydney house (UTC+10/+11),
 * a housemate checking their chores at 8am sees the previous day's list,
 * because 8am Sydney is 10pm UTC the day before. That's every morning
 * until 10am — precisely when people look.
 *
 * So "today" is resolved in the household's own timezone, then expressed
 * as UTC midnight so it lines up with how dates are stored and compared.
 */

/**
 * IANA timezone the house lives in. Override with the HOUSE_TIMEZONE
 * environment variable. This is a deployment-wide setting for now; making
 * it a per-household column is the natural next step once a settings page
 * exists (see the roadmap).
 */
export const HOUSE_TIMEZONE = process.env.HOUSE_TIMEZONE ?? "Australia/Sydney";

/**
 * The current calendar date in the house's timezone, as a UTC-midnight
 * Date — directly comparable to the date columns in the schema.
 */
export function houseToday(now: Date = new Date(), timeZone: string = HOUSE_TIMEZONE): Date {
  // en-CA formats as YYYY-MM-DD, which parses unambiguously.
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const [year, month, day] = formatted.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Normalises any Date to UTC midnight. For an arbitrary date value, not for "now" — use houseToday() for that. */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Adds (or subtracts, with a negative value) whole days to a UTC-midnight date. */
export function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
