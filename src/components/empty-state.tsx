import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * An empty list should say what to do next, not just that it is empty.
 * Deliberately quiet: a muted icon, one line, and an optional action.
 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 px-4 py-8 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}
      <p className="text-sm font-medium">{title}</p>
      {hint ? (
        <p className="max-w-xs text-sm text-muted-foreground">{hint}</p>
      ) : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
