import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      avatarColor?: string;
    } & DefaultSession["user"];
  }

  interface User {
    avatarColor?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    avatarColor?: string;
  }
}
