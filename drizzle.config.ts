import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// The drizzle-kit CLI doesn't get Next.js's automatic .env.local loading —
// load it explicitly, falling back to .env. (dotenv's config() never
// overrides a variable that's already set, so .env.local wins.)
config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local first.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
