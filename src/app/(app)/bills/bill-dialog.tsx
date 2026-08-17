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
import { BillForm, type BillFormDefaults } from "./bill-form";
import type { BillFormState } from "./actions";

export function BillDialog({
  trigger,
  title,
  description,
  action,
  defaults,
  submitLabel,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  action: (prev: BillFormState, formData: FormData) => Promise<BillFormState>;
  defaults: BillFormDefaults;
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
        <BillForm
          action={action}
          defaults={defaults}
          submitLabel={submitLabel}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
