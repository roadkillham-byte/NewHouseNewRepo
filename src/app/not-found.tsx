import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1>That page doesn&apos;t exist</h1>
          </CardTitle>
          <CardDescription>
            The link might be out of date, or the thing it pointed at has been removed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button nativeButton={false} render={<Link href="/">Back to the dashboard</Link>} />
        </CardContent>
      </Card>
    </div>
  );
}
