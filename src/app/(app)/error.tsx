"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Catches failures in the authenticated pages below this layout.
 *
 * Deliberately generic: in production Next.js redacts server errors before
 * they reach the client, so all this boundary ever receives is an empty
 * Error plus a digest. Anything that needs to explain *why* something
 * failed — the sleeping-database case in particular — has to be decided on
 * the server, where the real error still exists. See
 * src/components/database-waking.tsx.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Reaches the server logs in production, the terminal in dev.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1>Something went wrong</h1>
          </CardTitle>
          <CardDescription>
            That page didn&apos;t load. Trying again usually sorts it — if it keeps happening,
            the reference below will be in the logs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={reset}>Try again</Button>
          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
