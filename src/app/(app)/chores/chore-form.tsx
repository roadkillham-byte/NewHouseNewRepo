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
import { Textarea } from "@/components/ui/textarea";
import type { RecurrenceFrequency } from "@/lib/recurrence";
import type { ChoreFormState } from "./actions";

const WEEKDAYS = [
  { index: 0, label: "Mon" },
  { index: 1, label: "Tue" },
  { index: 2, label: "Wed" },
  { index: 3, label: "Thu" },
  { index: 4, label: "Fri" },
  { index: 5, label: "Sat" },
  { index: 6, label: "Sun" },
];

export interface ChoreFormDefaults {
  title: string;
  notes: string;
  area: string;
  startDate: string; // yyyy-mm-dd
  effortPoints: number;
  rotationStrategy: "round_robin" | "fixed";
  fixedAssigneeId: string;
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek: number[];
  dayOfMonth: number;
}

export const emptyChoreFormDefaults: ChoreFormDefaults = {
  title: "",
  notes: "",
  area: "",
  startDate: new Date().toISOString().slice(0, 10),
  effortPoints: 1,
  rotationStrategy: "round_robin",
  fixedAssigneeId: "",
  frequency: "weekly",
  interval: 1,
  daysOfWeek: [],
  dayOfMonth: 1,
};

export function ChoreForm({
  action,
  defaults,
  members,
  submitLabel,
  onSuccess,
}: {
  action: (prev: ChoreFormState, formData: FormData) => Promise<ChoreFormState>;
  defaults: ChoreFormDefaults;
  members: { id: string; name: string }[];
  submitLabel: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState<ChoreFormState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (!result?.error) onSuccess?.();
      return result;
    },
    undefined,
  );

  const [frequency, setFrequency] = useState<RecurrenceFrequency>(defaults.frequency);
  const [rotationStrategy, setRotationStrategy] = useState(defaults.rotationStrategy);
  const [daysOfWeek, setDaysOfWeek] = useState<Set<number>>(new Set(defaults.daysOfWeek));

  const fieldError = (name: string) => state?.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={defaults.title} required />
        {fieldError("title") ? <p className="text-sm text-destructive">{fieldError("title")}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="area">Area</Label>
          <Input id="area" name="area" defaultValue={defaults.area} placeholder="Kitchen" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="effortPoints">Effort points</Label>
          <Input
            id="effortPoints"
            name="effortPoints"
            type="number"
            min={1}
            max={20}
            defaultValue={defaults.effortPoints}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={defaults.notes} rows={2} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="startDate">Start date</Label>
        <Input
          id="startDate"
          name="startDate"
          type="date"
          defaultValue={defaults.startDate}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="frequency">Recurrence</Label>
        <Select
          name="frequency"
          value={frequency}
          onValueChange={(value) => setFrequency(value as RecurrenceFrequency)}
        >
          <SelectTrigger id="frequency" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="once">One-off (e.g. move-in checklist item)</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {frequency !== "once" ? (
        <div className="space-y-2">
          <Label htmlFor="interval">
            Every{" "}
            {frequency === "daily" ? "N days" : frequency === "weekly" ? "N weeks" : "N months"}
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
      ) : null}

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
        <Label htmlFor="rotationStrategy">Assignment</Label>
        <Select
          name="rotationStrategy"
          value={rotationStrategy}
          onValueChange={(value) => setRotationStrategy(value as "round_robin" | "fixed")}
        >
          <SelectTrigger id="rotationStrategy" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="round_robin">Rotate through the house</SelectItem>
            <SelectItem value="fixed">Always the same person</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rotationStrategy === "fixed" ? (
        <div className="space-y-2">
          <Label htmlFor="fixedAssigneeId">Assigned to</Label>
          <Select name="fixedAssigneeId" defaultValue={defaults.fixedAssigneeId || undefined}>
            <SelectTrigger id="fixedAssigneeId" className="w-full">
              <SelectValue placeholder="Choose a housemate" />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError("fixedAssigneeId") ? (
            <p className="text-sm text-destructive">{fieldError("fixedAssigneeId")}</p>
          ) : null}
        </div>
      ) : null}

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
