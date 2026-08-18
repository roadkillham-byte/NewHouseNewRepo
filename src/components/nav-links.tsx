"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Home, Receipt, Scale, Settings, Sofa } from "lucide-react";
import { cn } from "@/lib/utils";

// Accent classes are spelled out rather than interpolated, because Tailwind
// only generates class names it can find as literals in the source.
const LINKS = [
  { href: "/", label: "Home", icon: Home, accent: "text-primary" },
  { href: "/chores", label: "Chores", icon: CalendarCheck, accent: "text-module-chores" },
  { href: "/bills", label: "Bills", icon: Receipt, accent: "text-module-bills" },
  { href: "/furniture", label: "Furniture", icon: Sofa, accent: "text-module-furniture" },
  { href: "/settle", label: "Settle", icon: Scale, accent: "text-module-settle" },
  { href: "/settings", label: "Settings", icon: Settings, accent: "text-module-settings" },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/** Inline nav for the header. Hidden on small screens — see BottomNav. */
export function NavLinks() {
  const isActive = useIsActive();

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive(link.href)
              ? cn("bg-accent", link.accent)
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Thumb-reachable tab bar for phones, where five inline links in the header
 * overflow the viewport. Hidden from md up, where NavLinks takes over.
 */
export function BottomNav() {
  const isActive = useIsActive();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {LINKS.map((link) => {
          const active = isActive(link.href);
          const Icon = link.icon;
          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors",
                  active ? link.accent : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.5]")} aria-hidden />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
