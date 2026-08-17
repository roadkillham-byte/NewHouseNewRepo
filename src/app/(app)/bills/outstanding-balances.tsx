import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberAvatar } from "@/components/member-avatar";
import { formatMoney } from "@/lib/money";

interface BalanceRow {
  memberId: string;
  name: string;
  avatarColor: string;
  owedCents: number;
}

export function OutstandingBalances({ rows }: { rows: BalanceRow[] }) {
  const totalOwed = rows.reduce((sum, r) => sum + r.owedCents, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding balances</CardTitle>
        <CardDescription>What each person still owes right now.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {totalOwed === 0 ? (
          <p className="text-sm text-muted-foreground">Everyone&apos;s square. 🎉</p>
        ) : (
          rows
            .filter((r) => r.owedCents > 0)
            .map((row) => (
              <div key={row.memberId} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MemberAvatar name={row.name} color={row.avatarColor} />
                  <span className="text-sm">{row.name}</span>
                </div>
                <span className="text-sm font-medium">{formatMoney(row.owedCents)}</span>
              </div>
            ))
        )}
      </CardContent>
    </Card>
  );
}
