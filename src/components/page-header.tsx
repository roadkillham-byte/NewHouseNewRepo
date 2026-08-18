import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Module accents are identity, not state — see the note in globals.css. */
export type ModuleAccent =
  | "chores"
  | "bills"
  | "furniture"
  | "settle"
  | "settings"
  | "home";

const ACCENT_TEXT: Record<ModuleAccent, string> = {
  home: "text-primary",
  chores: "text-module-chores",
  bills: "text-module-bills",
  furniture: "text-module-furniture",
  settle: "text-module-settle",
  settings: "text-module-settings",
};

const ACCENT_RULE: Record<ModuleAccent, string> = {
  home: "bg-primary",
  chores: "bg-module-chores",
  bills: "bg-module-bills",
  furniture: "bg-module-furniture",
  settle: "bg-module-settle",
  settings: "bg-module-settings",
};

export function PageHeader({
  title,
  description,
  icon: Icon,
  accent = "home",
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  accent?: ModuleAccent;
  actions?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {Icon ? (
              <Icon
                className={cn("size-5 shrink-0", ACCENT_TEXT[accent])}
                aria-hidden
              />
            ) : null}
            <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
          </div>
          {description ? (
            <p className="text-sm text-muted-foreground sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <div
        className={cn("h-0.5 w-12 rounded-full", ACCENT_RULE[accent])}
        aria-hidden
      />
    </div>
  );
}
