import type { NextAuthConfig } from "next-auth";

/**
 * Lightweight half of the Auth.js config — used by proxy.ts (formerly
 * "middleware"), which runs ahead of the app on every matched request and
 * should stay minimal per Next.js's own guidance. It deliberately doesn't
 * import the Postgres driver or bcryptjs. The `providers` array is
 * populated in auth.ts, which is only ever imported from server
 * components, server actions, and route handlers.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  // Required for self-hosting off Vercel (Vercel deployments are trusted
  // automatically). Without this, Auth.js rejects every request whose Host
  // header it doesn't already know, which includes plain `localhost` in
  // dev/test.
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        // Already signed in and heading for /login: bounce to the dashboard.
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      return isLoggedIn;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
