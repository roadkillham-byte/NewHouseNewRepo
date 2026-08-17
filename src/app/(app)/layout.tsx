import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { BottomNav, NavLinks } from "@/components/nav-links";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const name = session.user.name ?? session.user.email ?? "You";
  const initial = name.charAt(0).toUpperCase();

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            House OS
          </Link>
          <NavLinks />
          <div className="flex items-center gap-3">
            <Avatar
              className="h-8 w-8"
              style={{ backgroundColor: session.user.avatarColor ?? "#6366f1" }}
            >
              <AvatarFallback
                className="text-white"
                style={{ backgroundColor: session.user.avatarColor ?? "#6366f1" }}
              >
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
