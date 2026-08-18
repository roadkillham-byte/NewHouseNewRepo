"use client";

import { useActionState, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MemberAvatar } from "@/components/member-avatar";
import type { SettingsMemberRow } from "@/db/queries/settings";
import {
  addMemberAction,
  resetMemberPasswordAction,
  setMemberActiveAction,
  updateMemberAction,
} from "./actions";

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

export function MembersPanel({
  members,
  currentMemberId,
}: {
  members: SettingsMemberRow[];
  currentMemberId: string;
}) {
  const activeCount = members.filter((m) => m.active).length;

  return (
    <div className="space-y-4">
      <ul className="divide-y">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isSelf={member.id === currentMemberId}
            isLastActive={member.active && activeCount <= 1}
          />
        ))}
      </ul>
      <AddMemberDialog />
    </div>
  );
}

function MemberRow({
  member,
  isSelf,
  isLastActive,
}: {
  member: SettingsMemberRow;
  isSelf: boolean;
  isLastActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<string | null>(null);

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <MemberAvatar name={member.name} color={member.avatarColor} className="h-8 w-8" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{member.name}</span>
              {isSelf ? <Badge variant="secondary">You</Badge> : null}
              {!member.active ? <Badge variant="outline">Moved out</Badge> : null}
              {member.mustChangePassword ? (
                <Badge variant="outline">Hasn&apos;t set a password</Badge>
              ) : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <EditMemberDialog member={member} />
          {!isSelf ? (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run(async () => {
                  const pw = await resetMemberPasswordAction(member.id);
                  setResetPassword(pw);
                })
              }
            >
              Reset password
            </Button>
          ) : null}
          {!isSelf ? (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending || isLastActive}
              title={isLastActive ? "There has to be at least one active housemate" : undefined}
              onClick={() => run(() => setMemberActiveAction(member.id, !member.active))}
            >
              {member.active ? "Mark moved out" : "Move back in"}
            </Button>
          ) : null}
        </div>
      </div>

      {resetPassword ? (
        <TempPasswordNotice
          name={member.name}
          password={resetPassword}
          onDismiss={() => setResetPassword(null)}
        />
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </li>
  );
}

function EditMemberDialog({ member }: { member: SettingsMemberRow }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: Awaited<ReturnType<typeof updateMemberAction>>, formData: FormData) => {
      const result = await updateMemberAction(member.id, prev, formData);
      if (!result?.error) setOpen(false);
      return result;
    },
    undefined,
  );
  const [color, setColor] = useState(member.avatarColor);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            Edit
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit {member.name}</DialogTitle>
          <DialogDescription>Their display name and colour around the app.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`name-${member.id}`}>Name</Label>
            <Input id={`name-${member.id}`} name="name" defaultValue={member.name} required />
            {state?.fieldErrors?.name ? (
              <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Colour</Label>
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
                    (color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "hover:scale-110")
                  }
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialog() {
  const [open, setOpen] = useState(false);
  // Remount the body on every open so a previous run's state (a generated
  // password, a validation error) never greets the next person to click Add.
  const [instance, setInstance] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setInstance((n) => n + 1);
      }}
    >
      <DialogTrigger render={<Button>Add a housemate</Button>} />
      <DialogContent className="sm:max-w-sm">
        <AddMemberDialogBody key={instance} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialogBody({ onDone }: { onDone: () => void }) {
  const [state, formAction, isPending] = useActionState(addMemberAction, undefined);

  // On success the dialog switches from the form to the generated password
  // rather than closing. There's no email provider yet, so this string is the
  // only copy that will ever exist — it has to be acknowledged, not lost
  // behind a modal or dismissed by a stray click outside.
  if (state?.tempPassword) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{state.name ?? "They"} is in</DialogTitle>
          <DialogDescription>
            Pass this password on now — it isn&apos;t stored anywhere and won&apos;t be shown
            again.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border border-dashed p-3 text-center">
          <p className="font-mono text-xl tracking-wide">{state.tempPassword}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          They&apos;ll be asked to choose their own the first time they sign in.
        </p>
        <Button className="w-full" onClick={onDone}>
          Done
        </Button>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add a housemate</DialogTitle>
        <DialogDescription>
          You&apos;ll get a temporary password to pass on. They&apos;ll set their own when they
          first sign in.
        </DialogDescription>
      </DialogHeader>
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-name">Name</Label>
          <Input id="new-name" name="name" required autoFocus />
          {state?.fieldErrors?.name ? (
            <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-email">Email</Label>
          <Input id="new-email" name="email" type="email" required />
          {state?.fieldErrors?.email ? (
            <p className="text-sm text-destructive">{state.fieldErrors.email}</p>
          ) : null}
        </div>
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Adding…" : "Add housemate"}
        </Button>
      </form>
    </>
  );
}

function TempPasswordNotice({
  name,
  password,
  onDismiss,
}: {
  name: string;
  password: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="rounded-md border border-dashed p-3">
      <p className="text-sm font-medium">Temporary password for {name}</p>
      <p className="mt-1 font-mono text-lg tracking-wide">{password}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Pass this on now — it isn&apos;t shown again, and they&apos;ll be asked to change it when
        they sign in.
      </p>
      {onDismiss ? (
        <Button size="sm" variant="ghost" className="mt-2" onClick={onDismiss}>
          Got it
        </Button>
      ) : null}
    </div>
  );
}
