"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateHouseholdAction } from "./actions";

export function HouseForm({
  name,
  timezone,
  timezones,
}: {
  name: string;
  timezone: string;
  timezones: string[];
}) {
  const [state, formAction, isPending] = useActionState(updateHouseholdAction, undefined);
  const fieldError = (key: string) => state?.fieldErrors?.[key];

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="house-name">House name</Label>
        <Input id="house-name" name="name" defaultValue={name} required />
        {fieldError("name") ? (
          <p className="text-sm text-destructive">{fieldError("name")}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Select name="timezone" defaultValue={timezone}>
          <SelectTrigger id="timezone" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {timezones.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Decides what counts as &ldquo;today&rdquo; for chores and bill due dates.
        </p>
        {fieldError("timezone") ? (
          <p className="text-sm text-destructive">{fieldError("timezone")}</p>
        ) : null}
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-muted-foreground">{state.success}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save house settings"}
      </Button>
    </form>
  );
}
