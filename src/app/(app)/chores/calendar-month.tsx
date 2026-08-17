import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/member-avatar";
import type { ChoreInstanceRow } from "@/db/queries/chores";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarMonth({
  monthAnchor,
  chores,
}: {
  monthAnchor: Date;
  chores: ChoreInstanceRow[];
}) {
  const monthStart = startOfMonth(monthAnchor);
  const monthEnd = endOfMonth(monthAnchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const choresByDay = new Map<string, ChoreInstanceRow[]>();
  for (const row of chores) {
    const key = isoDate(row.instance.dueDate);
    const existing = choresByDay.get(key);
    if (existing) existing.push(row);
    else choresByDay.set(key, [row]);
  }

  const prevMonth = format(subMonths(monthStart, 1), "yyyy-MM-dd");
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM-dd");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{format(monthStart, "MMMM yyyy")}</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/chores?month=${prevMonth}`}>← Prev</Link>}
          />
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/chores?month=${nextMonth}`}>Next →</Link>}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border text-xs">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="bg-muted px-2 py-1 text-center font-medium">
              {label}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayChores = choresByDay.get(key) ?? [];
            const inMonth = isSameMonth(day, monthStart);
            return (
              <div
                key={key}
                className={
                  "min-h-24 bg-background p-1.5 " + (inMonth ? "" : "text-muted-foreground/50")
                }
              >
                <div
                  className={
                    "mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] " +
                    (isToday(day) ? "bg-primary text-primary-foreground" : "")
                  }
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayChores.slice(0, 3).map(({ instance, definition, assignee }) => (
                    <div
                      key={instance.id}
                      className={
                        "flex items-center gap-1 truncate rounded bg-muted px-1 py-0.5 " +
                        (instance.status === "done" ? "line-through opacity-60" : "")
                      }
                      title={definition.title}
                    >
                      <MemberAvatar name={assignee?.name} color={assignee?.avatarColor} className="h-3.5 w-3.5" />
                      <span className="truncate">{definition.title}</span>
                    </div>
                  ))}
                  {dayChores.length > 3 ? (
                    <p className="text-[10px] text-muted-foreground">
                      +{dayChores.length - 3} more
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
