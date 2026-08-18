"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { describeRule, parseRRuleToInput } from "@/lib/recurrence";
import type { ChoreDefinitionRow } from "@/db/queries/chores";
import { ChoreDialog } from "./chore-dialog";
import { emptyChoreFormDefaults, type ChoreFormDefaults } from "./chore-form";
import { createChoreAction, setChoreActiveAction, updateChoreAction } from "./actions";

export function ChoreManagementList({
  chores,
  members,
}: {
  chores: ChoreDefinitionRow[];
  members: { id: string; name: string }[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>All chores</CardTitle>
          <CardDescription>Manage what&apos;s on the roster.</CardDescription>
        </div>
        <ChoreDialog
          trigger="Add chore"
          title="Add a chore"
          description="Set it up once — the schedule and rotation take it from there."
          action={createChoreAction}
          defaults={emptyChoreFormDefaults}
          members={members}
          submitLabel="Add chore"
        />
      </CardHeader>
      <CardContent>
        {chores.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No chores yet"
            hint="Add the first one above and it'll fan out across the calendar."
          />
        ) : (
          <ul className="divide-y">
            {chores.map(({ definition, fixedAssignee }) => (
              <ChoreRow
                key={definition.id}
                definition={definition}
                fixedAssigneeName={fixedAssignee?.name ?? null}
                members={members}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ChoreRow({
  definition,
  fixedAssigneeName,
  members,
}: {
  definition: ChoreDefinitionRow["definition"];
  fixedAssigneeName: string | null;
  members: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  const defaults: ChoreFormDefaults = {
    title: definition.title,
    notes: definition.notes ?? "",
    area: definition.area ?? "",
    startDate: isoDate(definition.startDate),
    effortPoints: definition.effortPoints,
    rotationStrategy: definition.rotationStrategy,
    fixedAssigneeId: definition.fixedAssigneeId ?? "",
    ...parseRuleForForm(definition.rrule),
  };

  const scheduleLabel = definition.rrule
    ? describeRule(definition.rrule, definition.startDate)
    : "One-off";

  return (
    <li
      className="flex items-center justify-between gap-3 py-3"
      data-testid="chore-definition"
      data-chore={definition.title}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{definition.title}</span>
          {!definition.active ? <Badge variant="outline">Inactive</Badge> : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {scheduleLabel}
          {definition.area ? ` · ${definition.area}` : ""}
          {" · "}
          {definition.rotationStrategy === "fixed"
            ? `Always ${fixedAssigneeName ?? "unassigned"}`
            : "Rotates"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <ChoreDialog
          trigger="Edit"
          title="Edit chore"
          description="Changes apply to future occurrences — history is kept."
          action={updateChoreAction.bind(null, definition.id)}
          defaults={defaults}
          members={members}
          submitLabel="Save changes"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(() => setChoreActiveAction(definition.id, !definition.active))
          }
        >
          {definition.active ? "Deactivate" : "Reactivate"}
        </Button>
      </div>
    </li>
  );
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseRuleForForm(rrule: string | null): Pick<ChoreFormDefaults, "frequency" | "interval" | "daysOfWeek" | "dayOfMonth"> {
  const parsed = parseRRuleToInput(rrule);
  return {
    frequency: parsed.frequency,
    interval: parsed.interval ?? 1,
    daysOfWeek: parsed.daysOfWeek ?? [],
    dayOfMonth: parsed.dayOfMonth ?? 1,
  };
}
