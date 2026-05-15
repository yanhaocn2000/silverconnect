import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

type PgClient = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __scPg?: PgClient };

const client: PgClient =
  g.__scPg ??
  postgres(url, {
    ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
    prepare: false,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") g.__scPg = client;

export const db = drizzle(client, { schema });
export { schema };
export type DB = typeof db;
