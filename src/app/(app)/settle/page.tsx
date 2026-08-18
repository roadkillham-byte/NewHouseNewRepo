import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberAvatar } from "@/components/member-avatar";
import { requireMember } from "@/lib/session";
import { formatMoney } from "@/lib/money";
import { computeNetPositions, computeTransfers } from "@/lib/settlement";
import { getLedgerEntries, getLedgerParticipants } from "@/db/queries/settlement";

const ENTRY_TYPE_LABEL: Record<string, string> = {
  bill_payment: "Bill payment",
  furniture_contribution: "Furniture",
  adjustment: "Adjustment",
};

export default async function SettlePage() {
  const member = await requireMember();
  const householdId = member.householdId;

  const [participants, entries] = await Promise.all([
    getLedgerParticipants(householdId),
    getLedgerEntries(householdId),
  ]);

  const positions = computeNetPositions(participants);
  const transfers = computeTransfers(positions);
  const totalPot = positions.reduce((sum, p) => sum + p.paidCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settle up</h1>
        <p className="text-muted-foreground">
          Everything paid so far, netted off into the fewest possible payments.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Who pays whom</CardTitle>
              <CardDescription>
                {transfers.length === 0
                  ? "Everyone's square — no payments needed."
                  : `${transfers.length} payment${transfers.length === 1 ? "" : "s"} clears the whole house.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transfers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {totalPot === 0
                    ? "Nothing recorded yet. Mark a bill share paid or chip in on furniture and it'll show up here."
                    : "All settled. 🎉"}
                </p>
              ) : (
                <ul className="space-y-2">
                  {transfers.map((t, index) => (
                    <li
                      key={`${t.fromMemberId}-${t.toMemberId}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-md border p-3"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{t.fromName}</span>
                        <span className="text-muted-foreground">pays</span>
                        <span className="font-medium">{t.toName}</span>
                      </div>
                      <span className="font-semibold">{formatMoney(t.amountCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How that was worked out</CardTitle>
              <CardDescription>
                {formatMoney(totalPot)} spent in total, split {positions.length} ways.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {positions.map((position) => (
                  <li
                    key={position.memberId}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium">{position.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Paid {formatMoney(position.paidCents)} · fair share{" "}
                        {formatMoney(position.fairShareCents)}
                      </p>
                    </div>
                    <NetBadge netCents={position.netCents} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ledger</CardTitle>
            <CardDescription>Every payment recorded, newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {entries.map(({ entry, member }) => (
                  <li key={entry.id} className="flex items-center gap-2.5">
                    <MemberAvatar name={member.name} color={member.avatarColor} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        <span className="font-medium">{member.name}</span>{" "}
                        <span className="text-muted-foreground">
                          {ENTRY_TYPE_LABEL[entry.type] ?? entry.type}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.createdAt.toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium">
                      {formatMoney(entry.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NetBadge({ netCents }: { netCents: number }) {
  if (Math.abs(netCents) <= 1) return <Badge variant="outline">Square</Badge>;
  if (netCents > 0) {
    return <Badge variant="secondary">Owed {formatMoney(netCents)}</Badge>;
  }
  return <Badge variant="destructive">Owes {formatMoney(-netCents)}</Badge>;
}
