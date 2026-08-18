import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireMember } from "@/lib/session";
import { houseToday } from "@/lib/today";
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
  const member = await requireMember();
  const householdId = member.householdId;

  const { month } = await searchParams;
  const monthAnchor = month && !Number.isNaN(Date.parse(month)) ? new Date(month) : new Date();

  const gridStart = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 1 });

  const today = houseToday(new Date(), member.householdTimezone);
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
      <PageHeader
        title="Chores"
        description="Who's doing what, and when."
        icon={CalendarCheck}
        accent="chores"
      />

      {/* min-w-0 on the grid children: without it they default to
          min-width:auto and refuse to shrink below their widest content,
          so the calendar's fixed 7-column grid would push the whole page
          sideways instead of scrolling inside its own container. */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <CalendarMonth monthAnchor={monthAnchor} chores={monthChores} />
          <ChoreManagementList chores={definitions} members={memberOptions} />
        </div>
        <div className="min-w-0 space-y-6">
          <TodayList chores={todaysChores} />
          <FairnessLedger rows={fairness} />
          <MoveInChecklist rows={checklist} />
        </div>
      </div>
    </div>
  );
}
