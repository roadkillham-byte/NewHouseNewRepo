"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChoreForm, type ChoreFormDefaults } from "./chore-form";
import type { ChoreFormState } from "./actions";

export function ChoreDialog({
  trigger,
  title,
  description,
  action,
  defaults,
  members,
  submitLabel,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  action: (prev: ChoreFormState, formData: FormData) => Promise<ChoreFormState>;
  defaults: ChoreFormDefaults;
  members: { id: string; name: string }[];
  submitLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>{trigger}</Button>} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ChoreForm
          action={action}
          defaults={defaults}
          members={members}
          submitLabel={submitLabel}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
