import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberAvatar } from "@/components/member-avatar";
import type { OutstandingChoreRow } from "@/db/queries/dashboard";
import { CompleteButton } from "./chores/instance-actions";

export function ChoreCheckpoint({
  chores,
  today,
  currentMemberId,
}: {
  chores: OutstandingChoreRow[];
  today: Date;
  currentMemberId: string;
}) {
  const mine = chores.filter((c) => c.instance.assigneeId === currentMemberId);
  const others = chores.filter((c) => c.instance.assigneeId !== currentMemberId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chores</CardTitle>
        <CardDescription>
          {chores.length === 0
            ? "Nothing outstanding — the house is on top of it."
            : `${mine.length} yours, ${others.length} elsewhere in the house.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {chores.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Next ones will appear here as they fall due.
          </p>
        ) : (
          <>
            {mine.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Yours</p>
                <ul className="divide-y">
                  {mine.map((row) => (
                    <ChoreRow key={row.instance.id} row={row} today={today} showAssignee={false} />
                  ))}
                </ul>
              </div>
            ) : null}

            {others.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Everyone else</p>
                <ul className="divide-y">
                  {others.map((row) => (
                    <ChoreRow key={row.instance.id} row={row} today={today} showAssignee />
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}

        <Link href="/chores" className="block text-sm text-primary hover:underline">
          Open the chore calendar →
        </Link>
      </CardContent>
    </Card>
  );
}

function ChoreRow({
  row,
  today,
  showAssignee,
}: {
  row: OutstandingChoreRow;
  today: Date;
  showAssignee: boolean;
}) {
  const { instance, definition, assignee } = row;
  const overdue = instance.dueDate.getTime() < today.getTime();

  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2">
        {showAssignee ? (
          <MemberAvatar name={assignee?.name} color={assignee?.avatarColor} />
        ) : null}
        <div>
          <p className="text-sm">{definition.title}</p>
          <p className="text-xs text-muted-foreground">
            {definition.area ? `${definition.area} · ` : ""}
            {overdue
              ? `Overdue since ${instance.dueDate.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`
              : "Due today"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {overdue ? <Badge variant="destructive">Overdue</Badge> : null}
        <CompleteButton instanceId={instance.id} />
      </div>
    </li>
  );
}
