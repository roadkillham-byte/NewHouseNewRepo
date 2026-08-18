import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberAvatar } from "@/components/member-avatar";
import type { MoveInChecklistRow } from "@/db/queries/chores";
import { CompleteButton, UndoButton } from "./instance-actions";

export function MoveInChecklist({ rows }: { rows: MoveInChecklistRow[] }) {
  const done = rows.filter((r) => r.instance?.status === "done").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Move-in checklist</CardTitle>
        <CardDescription>
          {rows.length === 0
            ? "One-off setup tasks — utilities, internet, bond, mail redirection."
            : `${done} of ${rows.length} done`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing here yet — add a one-off chore to get started.
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map(({ definition, instance, assignee }) => (
              <li
                key={definition.id}
                className="flex items-center justify-between gap-3 py-2.5"
                data-testid="checklist-item"
                data-chore={definition.title}
              >
                <div className="flex items-center gap-3">
                  <MemberAvatar name={assignee?.name} color={assignee?.avatarColor} />
                  <span
                    className={
                      instance?.status === "done"
                        ? "text-sm line-through text-muted-foreground"
                        : "text-sm"
                    }
                  >
                    {definition.title}
                  </span>
                </div>
                {instance ? (
                  instance.status === "done" ? (
                    <UndoButton instanceId={instance.id} />
                  ) : (
                    <CompleteButton instanceId={instance.id} />
                  )
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
