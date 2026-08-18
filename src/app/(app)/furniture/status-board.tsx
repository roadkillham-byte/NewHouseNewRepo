"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import type { FurnitureItemRow } from "@/db/queries/furniture";
import { ItemDialog } from "./item-dialog";
import { emptyItemFormDefaults, type ItemFormDefaults } from "./item-form";
import { createItemAction, setItemStatusAction, updateItemAction } from "./actions";
import { ContributionsPanel } from "./contributions-panel";
import { ContributionList } from "./contribution-list";

type Status = "needed" | "researching" | "ordered" | "owned";

const COLUMNS: { status: Status; label: string }[] = [
  { status: "needed", label: "Needed" },
  { status: "researching", label: "Researching" },
  { status: "ordered", label: "Ordered" },
  { status: "owned", label: "Owned" },
];

const NEXT_STATUS: Record<Status, Status | null> = {
  needed: "researching",
  researching: "ordered",
  ordered: "owned",
  owned: null,
};

const PRIORITY_LABEL: Record<number, string> = { 1: "High", 2: "Medium", 3: "Low" };

export function StatusBoard({ items }: { items: FurnitureItemRow[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Furnishing board</CardTitle>
          <CardDescription>What the house needs, and what it already has.</CardDescription>
        </div>
        <ItemDialog
          trigger="Add item"
          title="Add an item"
          description="Track something the house needs, is looking at, or already owns."
          action={createItemAction}
          defaults={emptyItemFormDefaults}
          submitLabel="Add item"
        />
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing tracked yet — add the first item above.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((column) => {
              const columnItems = items.filter((i) => i.item.status === column.status);
              return (
                <div key={column.status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">{column.label}</h3>
                    <span className="text-xs text-muted-foreground">{columnItems.length}</span>
                  </div>
                  <div className="space-y-2">
                    {columnItems.length === 0 ? (
                      <p className="rounded-md border border-dashed px-2 py-3 text-center text-xs text-muted-foreground">
                        Empty
                      </p>
                    ) : (
                      columnItems.map((row) => <ItemCard key={row.item.id} row={row} />)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ItemCard({ row }: { row: FurnitureItemRow }) {
  const [isPending, startTransition] = useTransition();
  const { item, purchasedBy, contributedCents, contributions } = row;
  const nextStatus = NEXT_STATUS[item.status as Status];

  const defaults: ItemFormDefaults = {
    name: item.name,
    room: item.room ?? "",
    status: item.status as Status,
    priority: item.priority,
    estimatedAmount: item.estimatedCents !== null ? (item.estimatedCents / 100).toFixed(2) : "",
    actualAmount: item.actualCents !== null ? (item.actualCents / 100).toFixed(2) : "",
    url: item.url ?? "",
    fundingSource: item.fundingSource as "house" | "individual",
  };

  const price = item.status === "owned" ? item.actualCents : item.estimatedCents;

  return (
    <div className="space-y-2 rounded-md border p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.room ?? "Unassigned"}
            {item.priority === 1 ? ` · ${PRIORITY_LABEL[item.priority]}` : ""}
          </p>
        </div>
        {price !== null ? (
          <span className="shrink-0 text-xs font-medium">{formatMoney(price)}</span>
        ) : null}
      </div>

      {item.url ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-xs text-primary hover:underline"
        >
          View listing →
        </a>
      ) : null}

      {item.status === "owned" && purchasedBy ? (
        <p className="text-xs text-muted-foreground">Bought by {purchasedBy.name}</p>
      ) : null}

      {item.fundingSource === "house" ? (
        <div className="space-y-1.5">
          <ContributionsPanel
            itemId={item.id}
            contributedCents={contributedCents}
            targetCents={price}
            isOwned={item.status === "owned"}
            purchaserName={purchasedBy?.name ?? null}
          />
          <ContributionList
            contributions={contributions.map((c) => ({
              id: c.id,
              amountCents: c.amountCents,
              memberName: c.memberName,
              memberColor: c.memberColor,
            }))}
          />
        </div>
      ) : (
        <Badge variant="outline">One person</Badge>
      )}

      <div className="flex flex-wrap gap-1.5">
        <ItemDialog
          trigger="Edit"
          title="Edit item"
          description="Update the details, price, or status."
          action={updateItemAction.bind(null, item.id)}
          defaults={defaults}
          submitLabel="Save changes"
        />
        {nextStatus ? (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => startTransition(() => setItemStatusAction(item.id, nextStatus))}
          >
            → {COLUMNS.find((c) => c.status === nextStatus)?.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
