import { requireMember } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { houseToday } from "@/lib/today";
import {
  getHouseStats,
  getOutstandingChores,
  getPersonalBalance,
  getRecentActivity,
  getUpcomingBills,
} from "@/db/queries/dashboard";
import { BillCheckpoint } from "./bill-checkpoint";
import { ChoreCheckpoint } from "./chore-checkpoint";
import { RecentActivity } from "./recent-activity";
import { StatTiles } from "./stat-tiles";

const BILL_HORIZON_DAYS = 14;
const ACTIVITY_WINDOW_DAYS = 7;

export default async function DashboardPage() {
  const member = await requireMember();
  const { householdId, id: memberId } = member;

  const today = houseToday(new Date(), member.householdTimezone);
  const firstName = member.name.split(" ")[0];

  const [chores, upcomingBills, personalOwedCents, stats, activity] = await Promise.all([
    getOutstandingChores(householdId, today),
    getUpcomingBills(householdId, today, BILL_HORIZON_DAYS),
    getPersonalBalance(memberId),
    getHouseStats(householdId, today),
    getRecentActivity(householdId, today, ACTIVITY_WINDOW_DAYS),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={
          <>
            {today.toLocaleDateString("en-AU", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            {" · "}
            {summaryLine(stats.choresPendingCount, personalOwedCents)}
          </>
        }
      />

      <StatTiles
        choresPendingCount={stats.choresPendingCount}
        unpaidShareCount={stats.unpaidShareCount}
        unpaidTotalCents={stats.unpaidTotalCents}
        furnitureNeededCount={stats.furnitureNeededCount}
        personalOwedCents={personalOwedCents}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <ChoreCheckpoint chores={chores} today={today} currentMemberId={memberId} />
          <BillCheckpoint periods={upcomingBills} today={today} currentMemberId={memberId} />
        </div>
        <div>
          <RecentActivity rows={activity} />
        </div>
      </div>
    </div>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function summaryLine(choresPending: number, owedCents: number): string {
  if (choresPending === 0 && owedCents === 0) return "nothing needs you right now";
  const parts: string[] = [];
  if (choresPending > 0) {
    parts.push(`${choresPending} chore${choresPending === 1 ? "" : "s"} outstanding`);
  }
  if (owedCents > 0) parts.push("money owed");
  return parts.join(", ");
}
