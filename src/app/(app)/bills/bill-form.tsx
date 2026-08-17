"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BillFormState } from "./actions";

const WEEKDAYS = [
  { index: 0, label: "Mon" },
  { index: 1, label: "Tue" },
  { index: 2, label: "Wed" },
  { index: 3, label: "Thu" },
  { index: 4, label: "Fri" },
  { index: 5, label: "Sat" },
  { index: 6, label: "Sun" },
];

type BillFrequency = "daily" | "weekly" | "monthly";

export interface BillFormDefaults {
  name: string;
  vendor: string;
  category: string;
  startDate: string;
  frequency: BillFrequency;
  interval: number;
  daysOfWeek: number[];
  dayOfMonth: number;
  amountMode: "fixed" | "variable";
  defaultAmount: string;
}

export const emptyBillFormDefaults: BillFormDefaults = {
  name: "",
  vendor: "",
  category: "",
  startDate: new Date().toISOString().slice(0, 10),
  frequency: "monthly",
  interval: 1,
  daysOfWeek: [],
  dayOfMonth: 1,
  amountMode: "fixed",
  defaultAmount: "",
};

export function BillForm({
  action,
  defaults,
  submitLabel,
  onSuccess,
}: {
  action: (prev: BillFormState, formData: FormData) => Promise<BillFormState>;
  defaults: BillFormDefaults;
  submitLabel: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState<BillFormState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (!result?.error) onSuccess?.();
      return result;
    },
    undefined,
  );

  const [frequency, setFrequency] = useState<BillFrequency>(defaults.frequency);
  const [amountMode, setAmountMode] = useState(defaults.amountMode);
  const [daysOfWeek, setDaysOfWeek] = useState<Set<number>>(new Set(defaults.daysOfWeek));

  const fieldError = (name: string) => state?.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={defaults.name} placeholder="Electricity" required />
        {fieldError("name") ? <p className="text-sm text-destructive">{fieldError("name")}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vendor">Vendor</Label>
          <Input id="vendor" name="vendor" defaultValue={defaults.vendor} placeholder="AGL" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" name="category" defaultValue={defaults.category} placeholder="Utilities" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="startDate">First due date</Label>
        <Input id="startDate" name="startDate" type="date" defaultValue={defaults.startDate} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="frequency">Due</Label>
        <Select
          name="frequency"
          value={frequency}
          onValueChange={(value) => setFrequency(value as BillFrequency)}
        >
          <SelectTrigger id="frequency" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="interval">
          Every {frequency === "daily" ? "N days" : frequency === "weekly" ? "N weeks" : "N months"}
        </Label>
        <Input
          id="interval"
          name="interval"
          type="number"
          min={1}
          max={30}
          defaultValue={defaults.interval}
          className="w-24"
        />
      </div>

      {frequency === "weekly" ? (
        <div className="space-y-2">
          <Label>Days of the week</Label>
          <div className="flex flex-wrap gap-3">
            {WEEKDAYS.map((day) => (
              <label key={day.index} className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  name="daysOfWeek"
                  value={String(day.index)}
                  checked={daysOfWeek.has(day.index)}
                  onCheckedChange={(checked) => {
                    setDaysOfWeek((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(day.index);
                      else next.delete(day.index);
                      return next;
                    });
                  }}
                />
                {day.label}
              </label>
            ))}
          </div>
          {fieldError("daysOfWeek") ? (
            <p className="text-sm text-destructive">{fieldError("daysOfWeek")}</p>
          ) : null}
        </div>
      ) : null}

      {frequency === "monthly" ? (
        <div className="space-y-2">
          <Label htmlFor="dayOfMonth">Day of month</Label>
          <Input
            id="dayOfMonth"
            name="dayOfMonth"
            type="number"
            min={1}
            max={31}
            defaultValue={defaults.dayOfMonth}
            className="w-24"
          />
          {fieldError("dayOfMonth") ? (
            <p className="text-sm text-destructive">{fieldError("dayOfMonth")}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="amountMode">Amount</Label>
        <Select
          name="amountMode"
          value={amountMode}
          onValueChange={(value) => setAmountMode(value as "fixed" | "variable")}
        >
          <SelectTrigger id="amountMode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Same every time</SelectItem>
            <SelectItem value="variable">Varies — enter each time it&apos;s due</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {amountMode === "fixed" ? (
        <div className="space-y-2">
          <Label htmlFor="defaultAmount">Amount ($)</Label>
          <Input
            id="defaultAmount"
            name="defaultAmount"
            type="text"
            inputMode="decimal"
            defaultValue={defaults.defaultAmount}
            placeholder="120.00"
          />
          {fieldError("defaultAmount") ? (
            <p className="text-sm text-destructive">{fieldError("defaultAmount")}</p>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Split evenly across active housemates when each bill falls due.
      </p>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
