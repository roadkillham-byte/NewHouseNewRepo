import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberAvatar } from "@/components/member-avatar";
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
          <p className="text-sm text-muted-foreground">You&apos;re clear for now.</p>
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
                      {status === "overdue" ? <Badge variant="destructive">Overdue</Badge> : null}
                      {status === "due_today" ? <Badge>Due today</Badge> : null}
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
                          <span className="text-sm font-medium">
                            {formatMoney(myShare.share.amountOwedCents)}
                          </span>
                        </div>
                        <MarkPaidButton shareId={myShare.share.id} />
                      </>
                    ) : myShare ? (
                      <Badge variant="outline">You&apos;ve paid</Badge>
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
