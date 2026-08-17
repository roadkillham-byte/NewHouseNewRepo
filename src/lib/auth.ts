import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { members } from "@/db/schema";
import { authConfig } from "./auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const [member] = await db
          .select()
          .from(members)
          .where(eq(members.email, email.toLowerCase()))
          .limit(1);

        if (!member || !member.active) return null;

        const passwordMatches = await bcrypt.compare(password, member.passwordHash);
        if (!passwordMatches) return null;

        return {
          id: member.id,
          name: member.name,
          email: member.email,
          avatarColor: member.avatarColor,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.avatarColor = (user as { avatarColor?: string }).avatarColor;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.avatarColor = token.avatarColor as string | undefined;
      }
      return session;
    },
  },
});
