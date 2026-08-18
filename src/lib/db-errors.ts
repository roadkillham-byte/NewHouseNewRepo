/**
 * Recognising a database-unreachable failure.
 *
 * Supabase's free tier pauses a project after a stretch of inactivity, so
 * the first request after a quiet weekend fails to connect and then works
 * fine on retry. That's the single most likely error a housemate will ever
 * hit, and it deserves "the database is waking up, try again" rather than a
 * stack trace.
 */

// postgres.js surfaces the driver's code; these are the connection-level ones.
const CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ECONNRESET",
  "EPIPE",
  "CONNECTION_CLOSED",
  "CONNECTION_ENDED",
  "CONNECT_TIMEOUT",
  "CONNECTION_DESTROYED",
  "57P01", // admin_shutdown
  "57P03", // cannot_connect_now — exactly what a waking Supabase returns
  "08000",
  "08003",
  "08006",
]);

export function isDatabaseUnreachable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && CONNECTION_ERROR_CODES.has(code)) return true;

  const message = (error as { message?: unknown }).message;
  if (typeof message === "string") {
    const m = message.toLowerCase();
    if (
      m.includes("connect econnrefused") ||
      m.includes("connection terminated") ||
      m.includes("timeout expired") ||
      m.includes("could not connect") ||
      m.includes("database_url is not set")
    ) {
      return true;
    }
  }

  // postgres.js wraps the underlying socket failure.
  const cause = (error as { cause?: unknown }).cause;
  if (cause && cause !== error) return isDatabaseUnreachable(cause);

  return false;
}
