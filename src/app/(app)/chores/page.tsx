import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { startOfUtcDay } from "@/lib/materialise";
import {
  getChoreDefinitions,
  getChoreInstancesForRange,
  getFairnessLedger,
  getMoveInChecklist,
  getTodaysChores,
} from "@/db/queries/chores";
import { getHouseholdMembers } from "@/db/queries/household";
import { CalendarMonth } from "./calendar-month";
import { ChoreManagementList } from "./chore-management-list";
import { FairnessLedger } from "./fairness-ledger";
import { MoveInChecklist } from "./move-in-checklist";
import { TodayList } from "./today-list";

export default async function ChoresPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const householdId = session.user.householdId;

  const { month } = await searchParams;
  const monthAnchor = month && !Number.isNaN(Date.parse(month)) ? new Date(month) : new Date();

  const gridStart = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 1 });

  const today = startOfUtcDay(new Date());
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const [definitions, members, checklist, fairness, todaysChores, monthChores] = await Promise.all([
    getChoreDefinitions(householdId),
    getHouseholdMembers(householdId),
    getMoveInChecklist(householdId),
    getFairnessLedger(householdId, thirtyDaysAgo),
    getTodaysChores(householdId, today),
    getChoreInstancesForRange(householdId, gridStart, gridEnd),
  ]);

  const memberOptions = members.map((m) => ({ id: m.id, name: m.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chores</h1>
        <p className="text-muted-foreground">Who&apos;s doing what, and when.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CalendarMonth monthAnchor={monthAnchor} chores={monthChores} />
          <ChoreManagementList chores={definitions} members={memberOptions} />
        </div>
        <div className="space-y-6">
          <TodayList chores={todaysChores} />
          <FairnessLedger rows={fairness} />
          <MoveInChecklist rows={checklist} />
        </div>
      </div>
    </div>
  );
}
