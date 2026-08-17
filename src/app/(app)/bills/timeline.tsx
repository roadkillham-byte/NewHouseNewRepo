import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberAvatar } from "@/components/member-avatar";
import { formatMoney } from "@/lib/money";
import { computeBillPeriodStatus, type BillPeriodDisplayStatus } from "@/lib/bill-status";
import type { BillPeriodTimelineRow } from "@/db/queries/bills";
import { AmountEntryForm, MarkPaidButton, UnmarkPaidButton } from "./share-actions";

const STATUS_LABEL: Record<BillPeriodDisplayStatus, string> = {
  settled: "Settled",
  overdue: "Overdue",
  due_today: "Due today",
  upcoming: "Upcoming",
};

const STATUS_VARIANT: Record<BillPeriodDisplayStatus, "default" | "secondary" | "destructive" | "outline"> = {
  settled: "outline",
  overdue: "destructive",
  due_today: "default",
  upcoming: "secondary",
};

export function Timeline({ periods, today }: { periods: BillPeriodTimelineRow[]; today: Date }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Due-date timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {periods.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bills due in this window.</p>
        ) : (
          <ul className="divide-y">
            {periods.map((row) => (
              <PeriodRow key={row.period.id} row={row} today={today} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PeriodRow({ row, today }: { row: BillPeriodTimelineRow; today: Date }) {
  const { period, bill, shares } = row;
  const status = computeBillPeriodStatus(
    period.dueDate,
    today,
    shares.map((s) => ({ paidAt: s.share.paidAt })),
  );

  return (
    <li className="space-y-2 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{bill.name}</p>
          <p className="text-xs text-muted-foreground">
            Due {period.dueDate.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
            {bill.vendor ? ` · ${bill.vendor}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {period.totalCents !== null ? (
            <span className="text-sm font-medium">{formatMoney(period.totalCents)}</span>
          ) : null}
          <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
        </div>
      </div>

      {period.totalCents === null ? (
        <AmountEntryForm periodId={period.id} />
      ) : (
        <ul className="space-y-1.5 pl-1">
          {shares.map(({ share, member }) => (
            <li key={share.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <MemberAvatar name={member.name} color={member.avatarColor} className="h-5 w-5" />
                <span>{member.name}</span>
                <span className="text-muted-foreground">{formatMoney(share.amountOwedCents)}</span>
              </div>
              {share.paidAt ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Paid</Badge>
                  <UnmarkPaidButton shareId={share.id} />
                </div>
              ) : (
                <MarkPaidButton shareId={share.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
