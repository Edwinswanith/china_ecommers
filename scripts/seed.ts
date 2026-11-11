/**
 * Load demo data into the MongoDB database named in .env.local.
 *   npm run db:seed    loads demo data if the database is empty
 *   npm run db:reset   deletes everything in that database first, then loads demo data
 */
import { getDb } from "@/lib/db/client";
import { seedIfEmpty } from "@/lib/db/seed";

async function main(): Promise<void> {
  const db = await getDb();
  if (process.argv.includes("--reset")) {
    const collections = [db.users, db.vendors, db.categories, db.products, db.orders, db.vendorOrders, db.orderItems, db.fulfillmentEvents, db.reviews, db.media];
    for (const collection of collections) await collection.deleteMany({});
    process.stdout.write("Deleted existing data.\n");
  }
  const seeded = await seedIfEmpty(db);
  process.stdout.write(seeded ? "Loaded demo data.\n" : "Database already has data; nothing to do. Use npm run db:reset to start over.\n");
  await db.client.close();
}

main().catch((error: unknown) => {
  process.stderr.write(`Seed failed: ${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
