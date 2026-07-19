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
    // DATABASE_URL points at Supabase's transaction pooler (port 6543), which
    // multiplexes many clients onto few Postgres connections but does not
    // support prepared statements. Migrations use DIRECT_DATABASE_URL instead.
    prepare: false,
    // A serverless invocation serves one request at a time, so a larger pool
    // per instance buys nothing.
    max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || "1", 10),
    // Long enough that a warm instance reuses its connection instead of
    // re-handshaking through the pooler on every request. The previous 20s
    // was a workaround for the session pooler's 15-client cap, which the
    // transaction pooler removed.
    idle_timeout: 120,
    // Fail a stalled handshake fast instead of spending the statement budget on it.
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__pagesCmsPostgresClient = client;
}

export const db = drizzle(client, { schema });
