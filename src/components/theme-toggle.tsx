"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/**
 * A three-way segmented control rather than a cycle button, so "system" is
 * reachable and the current choice is visible.
 *
 * Nothing is rendered as selected until after mount: the resolved theme is
 * only known on the client, and painting a guess server-side is a hydration
 * mismatch.
 */
const subscribe = () => () => {};

/** True only once the client has hydrated; false during SSR and the first pass. */
function useHydrated() {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useHydrated();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border p-0.5",
        className,
      )}
      role="group"
      aria-label="Colour theme"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            title={label}
            className={cn(
              "flex size-7 items-center justify-center rounded-full transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
