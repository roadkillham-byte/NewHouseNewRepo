/**
 * A bill_period's stored `status` column is set once at creation and never
 * kept in sync afterward (there's no cron tick dedicated to walking every
 * period every day). Rather than let that column drift stale and become a
 * source of bugs, the *displayed* status is always computed live from the
 * actual due date and payment state. Treat the stored column as
 * informational only — this function is the source of truth everywhere the
 * UI needs to know whether a period is overdue, due today, upcoming, or
 * settled.
 */

export type BillPeriodDisplayStatus = "settled" | "overdue" | "due_today" | "upcoming";

export function computeBillPeriodStatus(
  dueDate: Date,
  today: Date,
  shares: { paidAt: Date | null }[],
): BillPeriodDisplayStatus {
  const allPaid = shares.length > 0 && shares.every((s) => s.paidAt !== null);
  if (allPaid) return "settled";

  const due = startOfUtcDay(dueDate);
  const now = startOfUtcDay(today);
  if (due.getTime() < now.getTime()) return "overdue";
  if (due.getTime() === now.getTime()) return "due_today";
  return "upcoming";
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
