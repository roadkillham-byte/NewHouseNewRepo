import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { addUtcDays, houseToday } from "@/lib/today";
import { getBillDefinitions, getBillPeriodsForTimeline, getOutstandingBalances } from "@/db/queries/bills";
import { BillManagementList } from "./bill-management-list";
import { OutstandingBalances } from "./outstanding-balances";
import { Timeline } from "./timeline";

export default async function BillsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const householdId = session.user.householdId;

  const today = houseToday();
  const windowStart = addUtcDays(today, -14);
  const windowEnd = addUtcDays(today, 90);

  const [definitions, periods, balances] = await Promise.all([
    getBillDefinitions(householdId),
    getBillPeriodsForTimeline(householdId, windowStart, windowEnd),
    getOutstandingBalances(householdId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bills</h1>
        <p className="text-muted-foreground">What&apos;s due, and who&apos;s paid their share.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Timeline periods={periods} today={today} />
          <BillManagementList bills={definitions} />
        </div>
        <div className="space-y-6">
          <OutstandingBalances rows={balances} />
        </div>
      </div>
    </div>
  );
}
