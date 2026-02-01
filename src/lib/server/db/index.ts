import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://localhost:5432/clawchan";

// Create a connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Create drizzle instance
export const db = drizzle(pool, { schema });

// Export pool for closing connection
export { pool };

// Export schema for use in queries
export * from "./schema";
