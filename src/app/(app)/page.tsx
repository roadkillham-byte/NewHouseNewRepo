import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { householdId, id: memberId } = session.user;

  const today = houseToday();
  const firstName = (session.user.name ?? "there").split(" ")[0];

  const [chores, upcomingBills, personalOwedCents, stats, activity] = await Promise.all([
    getOutstandingChores(householdId, today),
    getUpcomingBills(householdId, today, BILL_HORIZON_DAYS),
    getPersonalBalance(memberId),
    getHouseStats(householdId, today),
    getRecentActivity(householdId, today, ACTIVITY_WINDOW_DAYS),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}, {firstName}
        </h1>
        <p className="text-muted-foreground">
          {today.toLocaleDateString("en-AU", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          {" · "}
          {summaryLine(stats.choresPendingCount, personalOwedCents)}
        </p>
      </div>

      <StatTiles
        choresPendingCount={stats.choresPendingCount}
        unpaidShareCount={stats.unpaidShareCount}
        unpaidTotalCents={stats.unpaidTotalCents}
        furnitureNeededCount={stats.furnitureNeededCount}
        personalOwedCents={personalOwedCents}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
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
