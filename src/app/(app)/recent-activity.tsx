import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberAvatar } from "@/components/member-avatar";
import { History } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { RecentActivityRow } from "@/db/queries/dashboard";

export function RecentActivity({ rows }: { rows: RecentActivityRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recently done</CardTitle>
        <CardDescription>Chores ticked off in the last week.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nothing done yet this week"
            hint="Completed chores show up here for seven days."
          />
        ) : (
          <ul className="space-y-2.5">
            {rows.map(({ instance, definition, completedBy }) => (
              <li key={instance.id} className="flex items-center gap-2.5">
                <MemberAvatar name={completedBy?.name} color={completedBy?.avatarColor} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-medium">{completedBy?.name ?? "Someone"}</span>{" "}
                    did {definition.title}
                  </p>
                  {instance.completedAt ? (
                    <p className="text-xs text-muted-foreground">
                      {instance.completedAt.toLocaleDateString("en-AU", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
