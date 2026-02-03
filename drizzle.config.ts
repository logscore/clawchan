import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgres://clawchan:clawchan@localhost:54320/clawchan",
  },
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/lib/server/db/schema.ts",
});
