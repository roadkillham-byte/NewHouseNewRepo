import { Receipt } from "lucide-react";
import { requireMember } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { addUtcDays, houseToday } from "@/lib/today";
import { getBillDefinitions, getBillPeriodsForTimeline, getOutstandingBalances } from "@/db/queries/bills";
import { BillManagementList } from "./bill-management-list";
import { OutstandingBalances } from "./outstanding-balances";
import { Timeline } from "./timeline";

export default async function BillsPage() {
  const member = await requireMember();
  const householdId = member.householdId;

  const today = houseToday(new Date(), member.householdTimezone);
  const windowStart = addUtcDays(today, -14);
  const windowEnd = addUtcDays(today, 90);

  const [definitions, periods, balances] = await Promise.all([
    getBillDefinitions(householdId),
    getBillPeriodsForTimeline(householdId, windowStart, windowEnd),
    getOutstandingBalances(householdId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bills"
        description="What's due, and who's paid their share."
        icon={Receipt}
        accent="bills"
      />

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
