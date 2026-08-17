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
import type { ItemFormState } from "./actions";

export interface ItemFormDefaults {
  name: string;
  room: string;
  status: "needed" | "researching" | "ordered" | "owned";
  priority: number;
  estimatedAmount: string;
  actualAmount: string;
  url: string;
  fundingSource: "house" | "individual";
}

export const emptyItemFormDefaults: ItemFormDefaults = {
  name: "",
  room: "",
  status: "needed",
  priority: 2,
  estimatedAmount: "",
  actualAmount: "",
  url: "",
  fundingSource: "house",
};

export function ItemForm({
  action,
  defaults,
  submitLabel,
  onSuccess,
}: {
  action: (prev: ItemFormState, formData: FormData) => Promise<ItemFormState>;
  defaults: ItemFormDefaults;
  submitLabel: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState<ItemFormState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (!result?.error) onSuccess?.();
      return result;
    },
    undefined,
  );

  const fieldError = (name: string) => state?.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={defaults.name} placeholder="Couch" required />
        {fieldError("name") ? <p className="text-sm text-destructive">{fieldError("name")}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="room">Room</Label>
          <Input id="room" name="room" defaultValue={defaults.room} placeholder="Living room" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select name="priority" defaultValue={String(defaults.priority)}>
            <SelectTrigger id="priority" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">High</SelectItem>
              <SelectItem value="2">Medium</SelectItem>
              <SelectItem value="3">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue={defaults.status}>
          <SelectTrigger id="status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="needed">Needed</SelectItem>
            <SelectItem value="researching">Researching</SelectItem>
            <SelectItem value="ordered">Ordered</SelectItem>
            <SelectItem value="owned">Owned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="estimatedAmount">Estimated ($)</Label>
          <Input
            id="estimatedAmount"
            name="estimatedAmount"
            type="text"
            inputMode="decimal"
            defaultValue={defaults.estimatedAmount}
            placeholder="800.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="actualAmount">Actual ($)</Label>
          <Input
            id="actualAmount"
            name="actualAmount"
            type="text"
            inputMode="decimal"
            defaultValue={defaults.actualAmount}
            placeholder="Once bought"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">Link</Label>
        <Input id="url" name="url" type="url" defaultValue={defaults.url} placeholder="https://…" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fundingSource">Funded by</Label>
        <Select name="fundingSource" defaultValue={defaults.fundingSource}>
          <SelectTrigger id="fundingSource" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="house">The house (split)</SelectItem>
            <SelectItem value="individual">One person</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
