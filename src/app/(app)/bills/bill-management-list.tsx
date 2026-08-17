"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { describeRule, parseRRuleToInput } from "@/lib/recurrence";
import { formatMoney } from "@/lib/money";
import type { BillDefinitionRow } from "@/db/queries/bills";
import { BillDialog } from "./bill-dialog";
import { emptyBillFormDefaults, type BillFormDefaults } from "./bill-form";
import { createBillAction, setBillActiveAction, updateBillAction } from "./actions";

export function BillManagementList({ bills }: { bills: BillDefinitionRow[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>All bills</CardTitle>
          <CardDescription>What&apos;s tracked, and how it&apos;s split.</CardDescription>
        </div>
        <BillDialog
          trigger="Add bill"
          title="Add a bill"
          description="It'll show up on the timeline as soon as it's due."
          action={createBillAction}
          defaults={emptyBillFormDefaults}
          submitLabel="Add bill"
        />
      </CardHeader>
      <CardContent>
        {bills.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bills yet — add the first one above.</p>
        ) : (
          <ul className="divide-y">
            {bills.map((bill) => (
              <BillRow key={bill.id} bill={bill} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function BillRow({ bill }: { bill: BillDefinitionRow }) {
  const [isPending, startTransition] = useTransition();

  const recurrenceInput = parseRRuleToInput(bill.rrule);
  const defaults: BillFormDefaults = {
    name: bill.name,
    vendor: bill.vendor ?? "",
    category: bill.category ?? "",
    startDate: isoDate(bill.startDate),
    frequency: recurrenceInput.frequency === "once" ? "monthly" : recurrenceInput.frequency,
    interval: recurrenceInput.interval ?? 1,
    daysOfWeek: recurrenceInput.daysOfWeek ?? [],
    dayOfMonth: recurrenceInput.dayOfMonth ?? 1,
    amountMode: bill.amountMode,
    defaultAmount:
      bill.defaultAmountCents !== null ? (bill.defaultAmountCents / 100).toFixed(2) : "",
  };

  const scheduleLabel = describeRule(bill.rrule, bill.startDate);
  const amountLabel =
    bill.amountMode === "fixed" && bill.defaultAmountCents !== null
      ? formatMoney(bill.defaultAmountCents)
      : "Varies";

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{bill.name}</span>
          {!bill.active ? <Badge variant="outline">Inactive</Badge> : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {scheduleLabel} · {amountLabel}
          {bill.category ? ` · ${bill.category}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <BillDialog
          trigger="Edit"
          title="Edit bill"
          description="Changes apply to future due dates — payment history is kept."
          action={updateBillAction.bind(null, bill.id)}
          defaults={defaults}
          submitLabel="Save changes"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => startTransition(() => setBillActiveAction(bill.id, !bill.active))}
        >
          {bill.active ? "Deactivate" : "Reactivate"}
        </Button>
      </div>
    </li>
  );
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
