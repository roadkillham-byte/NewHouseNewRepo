"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/member-avatar";
import { formatMoney } from "@/lib/money";
import { removeContributionAction } from "./actions";

export interface ContributionEntry {
  id: string;
  amountCents: number;
  memberName: string;
  memberColor: string;
}

export function ContributionList({ contributions }: { contributions: ContributionEntry[] }) {
  if (contributions.length === 0) return null;

  return (
    <ul className="space-y-1">
      {contributions.map((c) => (
        <ContributionRow key={c.id} contribution={c} />
      ))}
    </ul>
  );
}

function ContributionRow({ contribution }: { contribution: ContributionEntry }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-1.5 text-xs">
      <span className="flex min-w-0 items-center gap-1.5">
        <MemberAvatar
          name={contribution.memberName}
          color={contribution.memberColor}
          className="h-4 w-4"
        />
        <span className="truncate">{contribution.memberName}</span>
        <span className="text-muted-foreground">{formatMoney(contribution.amountCents)}</span>
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-5 px-1.5 text-xs"
        disabled={isPending}
        aria-label={`Remove ${contribution.memberName}'s ${formatMoney(contribution.amountCents)} contribution`}
        onClick={() => startTransition(() => removeContributionAction(contribution.id))}
      >
        Remove
      </Button>
    </li>
  );
}
