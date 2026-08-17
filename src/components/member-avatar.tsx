import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function MemberAvatar({
  name,
  color,
  className = "h-6 w-6",
}: {
  name: string | null | undefined;
  color: string | null | undefined;
  className?: string;
}) {
  const label = name ?? "Unassigned";
  const initial = label.charAt(0).toUpperCase();
  const background = color ?? "#94a3b8";

  return (
    <Avatar className={className} style={{ backgroundColor: background }} title={label}>
      <AvatarFallback className="text-white" style={{ backgroundColor: background }}>
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
