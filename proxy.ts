import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Everything requires a session except: Next's own internals, static
  // files, the Auth.js API routes (they issue the session), and the daily
  // materialise cron endpoint (Phase 1 — authenticated separately via
  // CRON_SECRET, not a user session).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|api/cron).*)"],
};
