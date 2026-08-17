import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { startOfUtcDay } from "@/lib/materialise";
import { getBillDefinitions, getBillPeriodsForTimeline, getOutstandingBalances } from "@/db/queries/bills";
import { BillManagementList } from "./bill-management-list";
import { OutstandingBalances } from "./outstanding-balances";
import { Timeline } from "./timeline";

export default async function BillsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const householdId = session.user.householdId;

  const today = startOfUtcDay(new Date());
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
        <div className="space-y-6 lg:col-span-2">
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

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
