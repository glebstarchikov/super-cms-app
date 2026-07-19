import "./envConfig";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __pagesCmsPostgresClient: ReturnType<typeof postgres> | undefined;
}

const client =
  globalThis.__pagesCmsPostgresClient
  ?? postgres(process.env.DATABASE_URL!, {
    // One connection per instance: a serverless invocation serves a single
    // request at a time, and Supabase's session pooler caps the whole project
    // at 15 clients — a larger pool per instance exhausts it after 3 of them.
    max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || "1", 10),
    // Warm instances otherwise hold their slot open indefinitely.
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__pagesCmsPostgresClient = client;
}

export const db = drizzle(client, { schema });
