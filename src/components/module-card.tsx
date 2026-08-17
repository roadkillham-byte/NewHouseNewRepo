import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ModuleCard({
  title,
  description,
  status,
  href,
}: {
  title: string;
  description: string;
  status: string;
  href: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={href} className="text-sm font-medium text-primary hover:underline">
          {status} →
        </Link>
      </CardContent>
    </Card>
  );
}
