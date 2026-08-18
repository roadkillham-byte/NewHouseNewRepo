import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberAvatar } from "@/components/member-avatar";
import { Coffee } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import type { ChoreInstanceRow } from "@/db/queries/chores";
import { CompleteButton, SkipButton, UndoButton } from "./instance-actions";

export function TodayList({ chores }: { chores: ChoreInstanceRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s chores</CardTitle>
      </CardHeader>
      <CardContent>
        {chores.length === 0 ? (
          <EmptyState
            icon={Coffee}
            title="Nothing due today"
            hint="Enjoy it — tomorrow's chores are already scheduled."
          />
        ) : (
          <ul className="divide-y">
            {chores.map(({ instance, definition, assignee }) => (
              <li
                key={instance.id}
                className="flex items-center justify-between gap-3 py-3"
                data-testid="today-chore"
                data-chore={definition.title}
              >
                <div className="flex items-center gap-3">
                  <MemberAvatar name={assignee?.name} color={assignee?.avatarColor} />
                  <div>
                    <p
                      className={
                        instance.status === "done"
                          ? "text-sm font-medium line-through text-muted-foreground"
                          : "text-sm font-medium"
                      }
                    >
                      {definition.title}
                    </p>
                    {definition.area ? (
                      <p className="text-xs text-muted-foreground">{definition.area}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {instance.status === "pending" ? (
                    <>
                      <SkipButton instanceId={instance.id} />
                      <CompleteButton instanceId={instance.id} />
                    </>
                  ) : instance.status === "done" ? (
                    <>
                      <StatusBadge tone="settled">Done</StatusBadge>
                      <UndoButton instanceId={instance.id} />
                    </>
                  ) : (
                    <StatusBadge tone="neutral">Skipped</StatusBadge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
