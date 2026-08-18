"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { changePasswordAction } from "./actions";

export function PasswordForm({ submitLabel = "Change password" }: { submitLabel?: string }) {
  const [state, formAction, isPending] = useActionState(changePasswordAction, undefined);
  const fieldError = (key: string) => state?.fieldErrors?.[key];

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
        {fieldError("currentPassword") ? (
          <p className="text-sm text-destructive">{fieldError("currentPassword")}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
        <p className="text-xs text-muted-foreground">
          At least {MIN_PASSWORD_LENGTH} characters. Length matters more than symbols — a few
          unrelated words works well.
        </p>
        {fieldError("newPassword") ? (
          <p className="text-sm text-destructive">{fieldError("newPassword")}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
        {fieldError("confirmPassword") ? (
          <p className="text-sm text-destructive">{fieldError("confirmPassword")}</p>
        ) : null}
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p role="status" className="text-sm text-muted-foreground">
          {state.success}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
