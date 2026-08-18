"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMemberAction } from "./actions";

const AVATAR_COLORS = [
  "#6366f1",
  "#ec4899",
  "#22c55e",
  "#f59e0b",
  "#06b6d4",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
];

export function ProfileForm({
  memberId,
  name,
  avatarColor,
}: {
  memberId: string;
  name: string;
  avatarColor: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateMemberAction.bind(null, memberId),
    undefined,
  );
  const [color, setColor] = useState(avatarColor);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="profile-name">Your name</Label>
        <Input id="profile-name" name="name" defaultValue={name} required />
        {state?.fieldErrors?.name ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Your colour</Label>
        <input type="hidden" name="avatarColor" value={color} />
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Use colour ${c}`}
              aria-pressed={color === c}
              className={
                "size-7 rounded-full transition-transform " +
                (color === c
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  : "hover:scale-110")
              }
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          How you show up on the chore calendar and in the ledger.
        </p>
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-muted-foreground">{state.success}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
