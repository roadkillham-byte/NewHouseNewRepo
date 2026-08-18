import { cn } from "@/lib/utils";

/**
 * The one status vocabulary for the whole app — bills timeline, dashboard
 * checkpoints, settle page. Kept separate from the module accents on purpose:
 * a module accent says where you are, a status says how something is going.
 */
export type StatusTone = "overdue" | "due" | "settled" | "neutral";

const TONE: Record<StatusTone, string> = {
  overdue: "bg-status-overdue-soft text-status-overdue",
  due: "bg-status-due-soft text-status-due",
  settled: "bg-status-settled-soft text-status-settled",
  neutral: "bg-status-neutral-soft text-status-neutral",
};

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
