"use client";

import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { markSharePaidAction, setBillPeriodAmountAction, unmarkSharePaidAction } from "./actions";

export function MarkPaidButton({ shareId }: { shareId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => startTransition(() => markSharePaidAction(shareId))}
    >
      Mark paid
    </Button>
  );
}

export function UnmarkPaidButton({ shareId }: { shareId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={isPending}
      onClick={() => startTransition(() => unmarkSharePaidAction(shareId))}
    >
      Undo
    </Button>
  );
}

export function AmountEntryForm({ periodId }: { periodId: string }) {
  const [state, formAction, isPending] = useActionState(
    setBillPeriodAmountAction.bind(null, periodId),
    undefined,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <Input
        name="amount"
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        className="h-8 w-24"
        required
      />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Saving…" : "Set amount"}
      </Button>
      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
    </form>
  );
}
