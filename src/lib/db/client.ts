import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

/**
 * One Postgres schema, two drivers:
 *  - DATABASE_URL set  -> real Postgres via node-postgres (staging/production)
 *  - DATABASE_URL empty -> embedded Postgres (PGlite) stored in .data/, so the
 *    project runs locally with zero database setup.
 * Both speak the same SQL, so nothing above this file knows the difference.
 */
export type Db = PgliteDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");
const globalStore = globalThis as unknown as { __storeDb?: Promise<Db> };

async function connectPostgres(url: string): Promise<Db> {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url, max: 10 });
  return drizzle(pool, { schema }) as unknown as Db;
}

async function connectEmbedded(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dataDir, { recursive: true });
  const db = drizzle(new PGlite(dataDir), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  const { seedIfEmpty } = await import("./seed");
  await seedIfEmpty(db);
  return db;
}

export function getDb(): Promise<Db> {
  if (!globalStore.__storeDb) {
    const url = process.env.DATABASE_URL;
    const connection = url ? connectPostgres(url) : connectEmbedded();
    globalStore.__storeDb = connection.catch((error: unknown) => {
      globalStore.__storeDb = undefined;
      throw error;
    });
  }
  return globalStore.__storeDb;
}
