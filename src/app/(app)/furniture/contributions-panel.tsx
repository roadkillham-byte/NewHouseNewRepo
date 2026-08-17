"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { addContributionAction } from "./actions";

/**
 * Tracks who has put money toward a house-funded item.
 *
 * The wording shifts with the item's status, because the same number means
 * two different things: before it's bought, contributions are people
 * pitching in toward a purchase ("$600 to go"); once it's owned, someone
 * has already fronted the cash and contributions are the others paying
 * them back ("$450 still to settle with Sam").
 */
export function ContributionsPanel({
  itemId,
  contributedCents,
  targetCents,
  isOwned,
  purchaserName,
}: {
  itemId: string;
  contributedCents: number;
  targetCents: number | null;
  isOwned: boolean;
  purchaserName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const result = await addContributionAction(itemId, prev, formData);
      if (!result?.error) setOpen(false);
      return result;
    },
    undefined,
  );

  const remaining = targetCents !== null ? targetCents - contributedCents : null;
  const label = isOwned ? "Paid back" : "Chipped in";
  const addLabel = isOwned ? "+ Settle up" : "+ Chip in";

  const remainingLabel = () => {
    if (remaining === null || remaining <= 0) {
      return isOwned ? "Fully settled" : "Fully covered";
    }
    if (isOwned) {
      return purchaserName
        ? `${formatMoney(remaining)} still owed to ${purchaserName}`
        : `${formatMoney(remaining)} still to settle`;
    }
    return `${formatMoney(remaining)} to go`;
  };

  return (
    <div className="space-y-1.5 rounded bg-muted/50 p-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{formatMoney(contributedCents)}</span>
      </div>

      {targetCents !== null && targetCents > 0 ? (
        <>
          <div className="h-1 w-full overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, (contributedCents / targetCents) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{remainingLabel()}</p>
        </>
      ) : null}

      {open ? (
        <form action={formAction} className="flex items-center gap-1.5">
          <Input
            name="amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            className="h-7 w-20 text-xs"
            required
            autoFocus
          />
          <Button type="submit" size="sm" disabled={isPending} className="h-7 text-xs">
            {isPending ? "…" : "Add"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-full text-xs"
          onClick={() => setOpen(true)}
        >
          {addLabel}
        </Button>
      )}

      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
    </div>
  );
}
