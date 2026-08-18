import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { formatMoney } from "@/lib/money";
import { HOUSE_TOTAL_KEY, type RoomRollup } from "@/lib/budget";

export function BudgetRollup({ rows }: { rows: RoomRollup[] }) {
  const house = rows.find((r) => r.room === HOUSE_TOTAL_KEY);
  const rooms = rows.filter((r) => r.room !== HOUSE_TOTAL_KEY);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget</CardTitle>
        <CardDescription>Spent so far, and what&apos;s still to come.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {house ? (
          <div className="space-y-1.5 rounded-md bg-muted/50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Spent</span>
              <span className="numeric font-medium">{formatMoney(house.actualCents)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Still to buy (est.)</span>
              <span className="numeric font-medium">{formatMoney(house.estimatedCents)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-1.5 text-sm">
              <span className="text-muted-foreground">Projected total</span>
              <span className="numeric font-semibold">
                {formatMoney(house.actualCents + house.estimatedCents)}
              </span>
            </div>
          </div>
        ) : null}

        {rooms.length === 0 ? (
          <EmptyState
            icon={Ruler}
            title="Nothing to add up yet"
            hint="Costs roll up by room as items are added."
          />
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">By room</p>
            {rooms.map((room) => (
              <div key={room.room} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{room.room}</p>
                  <p className="text-xs text-muted-foreground">
                    {room.ownedCount} owned · {room.neededCount} to go
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="numeric font-medium">{formatMoney(room.actualCents)}</p>
                  {room.estimatedCents > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      +{formatMoney(room.estimatedCents)} est.
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
