import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForPostgres = globalThis as typeof globalThis & {
  reflowPostgresClient?: ReturnType<typeof postgres>;
};

const client =
  globalForPostgres.reflowPostgresClient ??
  postgres(process.env.DATABASE_URL!, {
    max: 5,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.reflowPostgresClient = client;
}

export const db = drizzle(client, { schema });
