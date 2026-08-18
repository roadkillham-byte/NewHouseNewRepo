import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Server-rendered "the database is asleep" page.
 *
 * This can't live in a client error boundary: in production Next.js
 * redacts server errors before they reach the client, so `error.tsx` only
 * ever receives a generic Error plus a digest and has no way to tell a
 * sleeping database from any other failure. The classification has to
 * happen on the server, where the real error still exists.
 */
export function DatabaseWaking() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1>The database is waking up</h1>
          </CardTitle>
          <CardDescription>
            Nothing&apos;s broken and nothing&apos;s lost. The database pauses when the house
            hasn&apos;t used the app for a while, and takes a few seconds to come back.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Deliberately a plain <a>, not next/link. Recovering from a
              database outage wants a genuine fresh request to the server;
              a client-side navigation would issue an RSC fetch that can
              fail the same way and leave the page looking stuck. This also
              means the recovery path needs no JavaScript at all. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
