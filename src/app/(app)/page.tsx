import { auth } from "@/lib/auth";
import { ModuleCard } from "@/components/module-card";

export default async function DashboardPage() {
  const session = await auth();
  const firstName = (session?.user?.name ?? "there").split(" ")[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {firstName}</h1>
        <p className="text-muted-foreground">
          This will become the daily checkpoint — today&apos;s chores, bills due soon, and
          what you owe — once Phase 1&ndash;4 land.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <ModuleCard
          title="Chores"
          description="Assign, rotate, and track household chores on a shared calendar."
          status="Coming in Phase 1"
          href="/chores"
        />
        <ModuleCard
          title="Bills"
          description="Track due dates, split amounts, and who's paid their share."
          status="Coming in Phase 2"
          href="/bills"
        />
        <ModuleCard
          title="Furniture"
          description="What the house needs, has, and has spent on furnishing it."
          status="Coming in Phase 3"
          href="/furniture"
        />
      </div>
    </div>
  );
}
