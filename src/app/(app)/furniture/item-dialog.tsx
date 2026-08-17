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
import { ItemForm, type ItemFormDefaults } from "./item-form";
import type { ItemFormState } from "./actions";

export function ItemDialog({
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
  action: (prev: ItemFormState, formData: FormData) => Promise<ItemFormState>;
  defaults: ItemFormDefaults;
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
        <ItemForm
          action={action}
          defaults={defaults}
          submitLabel={submitLabel}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
