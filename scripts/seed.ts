/** Create the schema (embedded DB) and load demo data if the database is empty. */
import { getDb } from "@/lib/db/client";
import { seedIfEmpty } from "@/lib/db/seed";

async function main(): Promise<void> {
  const db = await getDb();
  const seeded = await seedIfEmpty(db);
  process.stdout.write(seeded ? "Seeded demo data.\n" : "Database already has data; nothing to do.\n");
  process.exit(0);
}

main().catch((error: unknown) => {
  process.stderr.write(`Seed failed: ${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
