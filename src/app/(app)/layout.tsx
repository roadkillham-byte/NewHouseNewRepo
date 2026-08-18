import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";
import { requireMember } from "@/lib/session";
import { BottomNav, NavLinks } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { DatabaseWaking } from "@/components/database-waking";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { isDatabaseUnreachable } from "@/lib/db-errors";
import type { CurrentMember } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Read fresh rather than from the JWT, so a renamed or deactivated member
  // is reflected on the very next request — see src/lib/session.ts.
  //
  // This is the app's first database call, and an error.tsx does not wrap
  // the layout in its own segment, so a sleeping database escapes the
  // boundaries entirely. Catch it here and say something useful. Anything
  // else — including the NEXT_REDIRECT that requireMember() throws to send
  // a signed-out visitor to /login — has to keep propagating.
  let member: CurrentMember;
  try {
    member = await requireMember();
  } catch (error) {
    if (isDatabaseUnreachable(error)) return <DatabaseWaking />;
    throw error;
  }

  if (member.mustChangePassword) {
    redirect("/change-password");
  }

  const initial = member.name.charAt(0).toUpperCase();

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          {/* The house's own name, not the product's — it is the one place
              the app should feel like theirs. Editable in Settings. */}
          <Link
            href="/"
            className="min-w-0 truncate font-heading text-lg font-semibold tracking-tight"
            title={member.householdName}
          >
            {member.householdName}
          </Link>
          <NavLinks />
          <div className="flex shrink-0 items-center gap-3">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Avatar
              className="h-8 w-8"
              style={{ backgroundColor: member.avatarColor }}
            >
              <AvatarFallback className="text-white" style={{ backgroundColor: member.avatarColor }}>
                {initial}
              </AvatarFallback>
            </Avatar>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      {/* Bottom padding on mobile clears the fixed tab bar. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 md:pb-8">{children}</main>
      <BottomNav />
    </div>
  );
}
