import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in your Supabase connection string.",
  );
}

// A single module-level client, reused across requests. In dev with hot
// reload we stash it on `globalThis` so repeated recompiles don't open a new
// connection pool each time.
const globalForDb = globalThis as unknown as {
  postgresClient?: postgres.Sql;
};

const client =
  globalForDb.postgresClient ??
  postgres(connectionString, {
    // Supabase's pooled connection string handles pooling itself; keep our
    // own pool small so we don't fight it.
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.postgresClient = client;
}

export const db = drizzle(client, { schema });
