import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";

export function StatTiles({
  choresPendingCount,
  unpaidShareCount,
  unpaidTotalCents,
  furnitureNeededCount,
  personalOwedCents,
}: {
  choresPendingCount: number;
  unpaidShareCount: number;
  unpaidTotalCents: number;
  furnitureNeededCount: number;
  personalOwedCents: number;
}) {
  const tiles = [
    {
      href: "/bills",
      label: "You owe",
      value: formatMoney(personalOwedCents),
      hint: personalOwedCents === 0 ? "All settled" : "across unpaid shares",
      emphasis: personalOwedCents > 0,
    },
    {
      href: "/chores",
      label: "Chores to do",
      value: String(choresPendingCount),
      hint: choresPendingCount === 0 ? "All caught up" : "due today or overdue",
      emphasis: choresPendingCount > 0,
    },
    {
      href: "/bills",
      label: "Unpaid across the house",
      value: formatMoney(unpaidTotalCents),
      hint: `${unpaidShareCount} share${unpaidShareCount === 1 ? "" : "s"} outstanding`,
      emphasis: false,
    },
    {
      href: "/furniture",
      label: "Still to furnish",
      value: String(furnitureNeededCount),
      hint: furnitureNeededCount === 0 ? "Fully furnished" : "items not yet owned",
      emphasis: false,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <Link key={tile.label} href={tile.href} className="block">
          <Card className="transition-colors hover:bg-accent/40">
            <CardContent className="space-y-0.5">
              <p className="text-xs text-muted-foreground">{tile.label}</p>
              <p
                className={
                  "text-2xl font-semibold tracking-tight " +
                  (tile.emphasis ? "text-foreground" : "text-foreground/80")
                }
              >
                {tile.value}
              </p>
              <p className="text-xs text-muted-foreground">{tile.hint}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
