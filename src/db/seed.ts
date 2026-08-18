/**
 * One-time (idempotent) seed script. Edit HOUSEHOLD_NAME and SEED_MEMBERS
 * below to match your house — real names and emails, whatever passwords you
 * want as a starting point — then run:
 *
 *   npm run db:seed
 *
 * Safe to re-run: the household is matched by name and only created once;
 * each member is matched by email and left untouched if it already exists.
 * The passwords below are temporary: every seeded member is flagged
 * `mustChangePassword`, so the app sends them to /change-password on first
 * sign-in. Once the house exists, add and manage housemates from Settings —
 * this script is only for bootstrapping an empty database.
 */
import { config } from "dotenv";

// Loaded explicitly, same as drizzle.config.ts — this runs via tsx, not
// Next.js, so it doesn't get Next's automatic .env.local loading. This must
// happen before ./index is evaluated (it reads DATABASE_URL at module load
// time), so ./index is imported dynamically below, after config() has run —
// a static top-level `import { db } from "./index"` here would load before
// these config() calls regardless of where it's written in the file.
config({ path: ".env.local" });
config();

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { households, members } from "./schema";

const HOUSEHOLD_NAME = "The House";

const SEED_MEMBERS = [
  { name: "Housemate 1", email: "housemate1@example.com", password: "change-me-1" },
  { name: "Housemate 2", email: "housemate2@example.com", password: "change-me-2" },
  { name: "Housemate 3", email: "housemate3@example.com", password: "change-me-3" },
  { name: "Housemate 4", email: "housemate4@example.com", password: "change-me-4" },
];

const AVATAR_COLORS = ["#6366f1", "#ec4899", "#22c55e", "#f59e0b"];

async function main() {
  const { db } = await import("./index");

  let [household] = await db
    .select()
    .from(households)
    .where(eq(households.name, HOUSEHOLD_NAME))
    .limit(1);

  if (!household) {
    [household] = await db
      .insert(households)
      .values({
        name: HOUSEHOLD_NAME,
        timezone: process.env.HOUSE_TIMEZONE ?? "Australia/Sydney",
      })
      .returning();
    console.log(`Created household "${household.name}" (${household.id})`);
  } else {
    console.log(`Household "${household.name}" already exists (${household.id})`);
  }

  for (const [index, seedMember] of SEED_MEMBERS.entries()) {
    const [existing] = await db
      .select()
      .from(members)
      .where(eq(members.email, seedMember.email))
      .limit(1);

    if (existing) {
      console.log(`Member ${seedMember.email} already exists, skipping.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(seedMember.password, 12);
    await db.insert(members).values({
      householdId: household.id,
      name: seedMember.name,
      email: seedMember.email,
      passwordHash,
      avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
      // Everyone seeded is handed a placeholder they must replace on first
      // sign-in — see /change-password.
      mustChangePassword: true,
    });
    console.log(
      `Created ${seedMember.name} <${seedMember.email}> — temporary password: ${seedMember.password}`,
    );
  }

  console.log(
    "\nSeed complete. Everyone above signs in with their temporary password and is\n" +
      "asked to choose their own straight away. After that, add and manage housemates\n" +
      "from Settings inside the app rather than re-running this script.",
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
