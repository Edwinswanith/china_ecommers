import { randomUUID } from "node:crypto";
import { MongoClient, type ClientSession, type Collection } from "mongodb";
import type {
  Category,
  FulfillmentEvent,
  MediaFile,
  Order,
  OrderItem,
  Product,
  Review,
  User,
  Vendor,
  VendorOrder,
} from "./schema";

/** A record as MongoDB stores it: the app's `id` is the document's `_id`. */
export type Doc<T extends { id: string }> = Omit<T, "id"> & { _id: string };

/** Typed handles to every collection, plus the client for transactions. */
export interface Db {
  readonly client: MongoClient;
  readonly users: Collection<Doc<User>>;
  readonly vendors: Collection<Doc<Vendor>>;
  readonly categories: Collection<Doc<Category>>;
  readonly products: Collection<Doc<Product>>;
  readonly orders: Collection<Doc<Order>>;
  readonly vendorOrders: Collection<Doc<VendorOrder>>;
  readonly orderItems: Collection<Doc<OrderItem>>;
  readonly fulfillmentEvents: Collection<Doc<FulfillmentEvent>>;
  readonly reviews: Collection<Doc<Review>>;
  readonly media: Collection<Doc<MediaFile>>;
}

export type Tx = ClientSession;

const DEFAULT_DB_NAME = "curio_store";
const DUPLICATE_KEY = 11000;
const globalStore = globalThis as unknown as { __storeDb?: Promise<Db> };

export const newId = (): string => randomUUID();

export function fromDoc<T extends { id: string }>(doc: Doc<T>): T {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest } as unknown as T;
}

export function toDoc<T extends { id: string }>(record: T): Doc<T> {
  const { id, ...rest } = record;
  return { _id: id, ...rest } as Doc<T>;
}

/** True when a write was rejected by a unique index (e.g. an email that is already registered). */
export function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === DUPLICATE_KEY;
}

/** Unique indexes are the real guards behind "one account per email", "one review per buyer" and so on. */
async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.users.createIndex({ email: 1 }, { unique: true }),
    db.vendors.createIndex({ ownerId: 1 }, { unique: true }),
    db.vendors.createIndex({ slug: 1 }, { unique: true }),
    db.categories.createIndex({ slug: 1 }, { unique: true }),
    db.products.createIndex({ slug: 1 }, { unique: true }),
    db.products.createIndex({ vendorId: 1, status: 1 }),
    db.products.createIndex({ categoryId: 1, status: 1 }),
    db.products.createIndex({ status: 1, createdAt: -1 }),
    db.orders.createIndex({ number: 1 }, { unique: true }),
    db.orders.createIndex({ customerId: 1, createdAt: -1 }),
    db.orders.createIndex({ createdAt: -1 }),
    db.vendorOrders.createIndex({ orderId: 1 }),
    db.vendorOrders.createIndex({ vendorId: 1, status: 1, createdAt: -1 }),
    db.orderItems.createIndex({ orderId: 1 }),
    db.orderItems.createIndex({ vendorOrderId: 1 }),
    db.orderItems.createIndex({ productId: 1 }),
    db.fulfillmentEvents.createIndex({ vendorOrderId: 1, createdAt: 1 }),
    db.reviews.createIndex({ productId: 1, userId: 1 }, { unique: true }),
    db.reviews.createIndex({ productId: 1, createdAt: -1 }),
  ]);
}

async function connect(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Add your MongoDB connection string to .env.local (see .env.example).");
  const client = await new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 15_000 }).connect();
  const database = client.db(process.env.MONGODB_DB || DEFAULT_DB_NAME);
  const db: Db = {
    client,
    users: database.collection("users"),
    vendors: database.collection("vendors"),
    categories: database.collection("categories"),
    products: database.collection("products"),
    orders: database.collection("orders"),
    vendorOrders: database.collection("vendor_orders"),
    orderItems: database.collection("order_items"),
    fulfillmentEvents: database.collection("fulfillment_events"),
    reviews: database.collection("reviews"),
    media: database.collection("media"),
  };
  await ensureIndexes(db);
  return db;
}

/** One shared connection per server process (and per serverless instance). */
export function getDb(): Promise<Db> {
  if (!globalStore.__storeDb) {
    globalStore.__storeDb = connect().catch((error: unknown) => {
      globalStore.__storeDb = undefined;
      throw error;
    });
  }
  return globalStore.__storeDb;
}

/**
 * Run several writes as one all-or-nothing unit. Every operation inside must
 * pass `{ session: tx }`. If the callback throws, nothing is saved.
 */
export async function withTransaction<T>(db: Db, work: (tx: Tx) => Promise<T>): Promise<T> {
  return db.client.withSession((session) => session.withTransaction(() => work(session)));
}

/** Look up many records by id at once and return them keyed by id. */
export async function byId<T extends { id: string }>(collection: Collection<Doc<T>>, ids: readonly string[]): Promise<Map<string, T>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const filter = { _id: { $in: unique } } as unknown as Parameters<Collection<Doc<T>>["find"]>[0];
  const docs = (await collection.find(filter).toArray()) as unknown as Doc<T>[];
  return new Map(docs.map((doc) => [doc._id, fromDoc<T>(doc)]));
}
