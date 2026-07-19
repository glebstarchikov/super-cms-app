import "./db/envConfig";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  strict: true,
  verbose: true,
  dbCredentials: {
    // Migrations need a session-mode connection: the transaction pooler that
    // DATABASE_URL points at cannot hold the session state DDL relies on.
    url: (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL)!,
  },
});
