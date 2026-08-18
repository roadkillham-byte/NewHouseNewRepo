import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { members } from "@/db/schema";
import { authConfig } from "./auth.config";
import { isRateLimited, recordLoginAttempt } from "./rate-limit";

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

        // Refuse before touching the password so a locked-out email costs an
        // attacker a cheap query rather than a bcrypt compare.
        if (await isRateLimited(email)) return null;

        const [member] = await db
          .select()
          .from(members)
          .where(eq(members.email, email.toLowerCase()))
          .limit(1);

        if (!member || !member.active) {
          await recordLoginAttempt(email, false);
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, member.passwordHash);
        if (!passwordMatches) {
          await recordLoginAttempt(email, false);
          return null;
        }

        await recordLoginAttempt(email, true);

        return {
          id: member.id,
          name: member.name,
          email: member.email,
          avatarColor: member.avatarColor,
          householdId: member.householdId,
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
        token.householdId = (user as { householdId?: string }).householdId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.avatarColor = token.avatarColor as string | undefined;
        session.user.householdId = token.householdId as string;
      }
      return session;
    },
  },
});
