import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberAvatar } from "@/components/member-avatar";

interface FairnessRow {
  memberId: string;
  name: string;
  avatarColor: string;
  points: number;
}

export function FairnessLedger({ rows }: { rows: FairnessRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.points));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fairness ledger</CardTitle>
        <CardDescription>Effort points completed in the last 30 days.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed chores yet.</p>
        ) : (
          rows.map((row) => (
            <div key={row.memberId} className="flex items-center gap-3">
              <MemberAvatar name={row.name} color={row.avatarColor} />
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{row.name}</span>
                  <span className="text-muted-foreground">{row.points} pts</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(row.points / max) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
