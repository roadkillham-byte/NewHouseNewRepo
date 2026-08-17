"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { completeInstanceAction, skipInstanceAction, uncompleteInstanceAction } from "./actions";

export function CompleteButton({ instanceId }: { instanceId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => startTransition(() => completeInstanceAction(instanceId))}
    >
      Done
    </Button>
  );
}

export function SkipButton({ instanceId }: { instanceId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={isPending}
      onClick={() => startTransition(() => skipInstanceAction(instanceId))}
    >
      Skip
    </Button>
  );
}

export function UndoButton({ instanceId }: { instanceId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={isPending}
      onClick={() => startTransition(() => uncompleteInstanceAction(instanceId))}
    >
      Undo
    </Button>
  );
}
