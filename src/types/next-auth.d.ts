import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      avatarColor?: string;
      householdId: string;
    } & DefaultSession["user"];
  }

  interface User {
    avatarColor?: string;
    householdId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    avatarColor?: string;
    householdId?: string;
  }
}
