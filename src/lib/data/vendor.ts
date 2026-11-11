import "server-only";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { orders, products, vendorOrders, type FulfillmentStatus, type Product } from "@/lib/db/schema";

export const LOW_STOCK_THRESHOLD = 10;

export interface VendorStats {
  readonly revenueMinor: number;
  readonly byStatus: Readonly<Record<FulfillmentStatus, number>>;
  readonly productCount: number;
  readonly lowStockCount: number;
}

const EMPTY_COUNTS: Record<FulfillmentStatus, number> = { new: 0, accepted: 0, packed: 0, shipped: 0, delivered: 0, cancelled: 0 };

export async function getVendorStats(vendorId: string): Promise<VendorStats> {
  const db = await getDb();
  const [statusRows, [revenue], [catalog]] = await Promise.all([
    db
      .select({ status: vendorOrders.status, count: sql<number>`count(*)::int` })
      .from(vendorOrders)
      .where(eq(vendorOrders.vendorId, vendorId))
      .groupBy(vendorOrders.status),
    db
      .select({ total: sql<number>`coalesce(sum(${vendorOrders.subtotalMinor}), 0)::float8` })
      .from(vendorOrders)
      .innerJoin(orders, eq(vendorOrders.orderId, orders.id))
      .where(and(eq(vendorOrders.vendorId, vendorId), ne(vendorOrders.status, "cancelled"), eq(orders.paymentStatus, "paid"))),
    db
      .select({
        count: sql<number>`count(*)::int`,
        low: sql<number>`count(*) filter (where ${products.stock} <= ${LOW_STOCK_THRESHOLD} and ${products.status} = 'active')::int`,
      })
      .from(products)
      .where(and(eq(products.vendorId, vendorId), ne(products.status, "archived"))),
  ]);
  const byStatus = statusRows.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), EMPTY_COUNTS);
  return { revenueMinor: revenue.total, byStatus, productCount: catalog.count, lowStockCount: catalog.low };
}

export async function listVendorOrders(vendorId: string, statuses?: readonly FulfillmentStatus[]) {
  const db = await getDb();
  return db.query.vendorOrders.findMany({
    where: and(eq(vendorOrders.vendorId, vendorId), statuses && statuses.length > 0 ? inArray(vendorOrders.status, [...statuses]) : undefined),
    orderBy: desc(vendorOrders.createdAt),
    limit: 200,
    with: {
      order: { columns: { number: true, createdAt: true, shippingAddress: true, paymentStatus: true, currency: true } },
      items: true,
    },
  });
}

/** Scoped by vendorId so a vendor can never read another vendor's shipment. */
export async function getVendorOrder(vendorOrderId: string, vendorId: string) {
  const db = await getDb();
  const row = await db.query.vendorOrders.findFirst({
    where: and(eq(vendorOrders.id, vendorOrderId), eq(vendorOrders.vendorId, vendorId)),
    with: {
      order: { columns: { number: true, createdAt: true, shippingAddress: true, paymentStatus: true, currency: true } },
      items: true,
      events: true,
    },
  });
  return row ?? null;
}

export async function listVendorProducts(vendorId: string): Promise<Product[]> {
  const db = await getDb();
  return db
    .select()
    .from(products)
    .where(and(eq(products.vendorId, vendorId), ne(products.status, "archived")))
    .orderBy(desc(products.createdAt));
}

export async function getVendorProduct(productId: string, vendorId: string): Promise<Product | null> {
  const db = await getDb();
  const [row] = await db.select().from(products).where(and(eq(products.id, productId), eq(products.vendorId, vendorId))).limit(1);
  return row ?? null;
}
