import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberAvatar } from "@/components/member-avatar";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/money";
import { computeBillPeriodStatus } from "@/lib/bill-status";
import type { UpcomingBillRow } from "@/db/queries/dashboard";
import { MarkPaidButton } from "./bills/share-actions";

export function BillCheckpoint({
  periods,
  today,
  currentMemberId,
}: {
  periods: UpcomingBillRow[];
  today: Date;
  currentMemberId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bills due soon</CardTitle>
        <CardDescription>
          {periods.length === 0
            ? "Nothing due in the next couple of weeks."
            : "Anything unpaid in the next 14 days."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {periods.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="You're clear for now"
            hint="Anything falling due in the next fortnight shows up here."
          />
        ) : (
          <ul className="divide-y">
            {periods.map((row) => {
              const status = computeBillPeriodStatus(
                row.period.dueDate,
                today,
                row.shares.map((s) => ({ paidAt: s.share.paidAt })),
              );
              const myShare = row.shares.find((s) => s.share.memberId === currentMemberId);
              const unpaidCount = row.shares.filter((s) => s.share.paidAt === null).length;

              return (
                <li key={row.period.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm">{row.bill.name}</p>
                      {status === "overdue" ? (
                        <StatusBadge tone="overdue">Overdue</StatusBadge>
                      ) : null}
                      {status === "due_today" ? (
                        <StatusBadge tone="due">Due today</StatusBadge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.period.totalCents !== null
                        ? `${formatMoney(row.period.totalCents)} · `
                        : "Amount not set · "}
                      {row.period.dueDate.toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                      })}
                      {` · ${unpaidCount} unpaid`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {myShare && myShare.share.paidAt === null ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <MemberAvatar
                            name={myShare.member.name}
                            color={myShare.member.avatarColor}
                            className="h-5 w-5"
                          />
                          <span className="numeric text-sm font-medium">
                            {formatMoney(myShare.share.amountOwedCents)}
                          </span>
                        </div>
                        <MarkPaidButton shareId={myShare.share.id} />
                      </>
                    ) : myShare ? (
                      <StatusBadge tone="settled">You&apos;ve paid</StatusBadge>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <Link href="/bills" className="block text-sm text-primary hover:underline">
          Open the bill timeline →
        </Link>
      </CardContent>
    </Card>
  );
}
