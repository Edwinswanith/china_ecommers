import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { categories, orders, products, users, vendorOrders, vendors, type FulfillmentStatus } from "@/lib/db/schema";

export interface AdminOverview {
  readonly grossSalesMinor: number;
  readonly orderCount: number;
  readonly averageOrderMinor: number;
  readonly customerCount: number;
  readonly vendorCount: number;
  readonly productCount: number;
  readonly shipments: Readonly<Record<FulfillmentStatus, number>>;
}

const EMPTY_COUNTS: Record<FulfillmentStatus, number> = { new: 0, accepted: 0, packed: 0, shipped: 0, delivered: 0, cancelled: 0 };

export async function getAdminOverview(): Promise<AdminOverview> {
  const db = await getDb();
  const [[sales], [people], [catalog], shipmentRows] = await Promise.all([
    db
      .select({
        total: sql<number>`coalesce(sum(${orders.totalMinor}) filter (where ${orders.paymentStatus} = 'paid'), 0)::float8`,
        count: sql<number>`count(*)::int`,
        paid: sql<number>`count(*) filter (where ${orders.paymentStatus} = 'paid')::int`,
      })
      .from(orders),
    db
      .select({
        customers: sql<number>`count(*) filter (where ${users.role} = 'customer')::int`,
        vendors: sql<number>`(select count(*)::int from ${vendors})`,
      })
      .from(users),
    db.select({ count: sql<number>`count(*) filter (where ${products.status} = 'active')::int` }).from(products),
    db.select({ status: vendorOrders.status, count: sql<number>`count(*)::int` }).from(vendorOrders).groupBy(vendorOrders.status),
  ]);
  return {
    grossSalesMinor: sales.total,
    orderCount: sales.count,
    averageOrderMinor: sales.paid > 0 ? Math.round(sales.total / sales.paid) : 0,
    customerCount: people.customers,
    vendorCount: people.vendors,
    productCount: catalog.count,
    shipments: shipmentRows.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), EMPTY_COUNTS),
  };
}

export interface VendorSalesRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly countryCode: string;
  readonly city: string;
  readonly status: "active" | "suspended";
  readonly contactEmail: string;
  readonly createdAt: Date;
  readonly revenueMinor: number;
  readonly shipmentCount: number;
  readonly pendingCount: number;
  readonly deliveredCount: number;
  readonly productCount: number;
}

/** Sales and fulfilment health per vendor, highest revenue first. */
export async function listVendorSales(): Promise<VendorSalesRow[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: vendors.id,
      name: vendors.name,
      slug: vendors.slug,
      countryCode: vendors.countryCode,
      city: vendors.city,
      status: vendors.status,
      contactEmail: vendors.contactEmail,
      createdAt: vendors.createdAt,
      revenueMinor: sql<number>`coalesce((select sum(vo.subtotal_minor) from vendor_orders vo join orders o on o.id = vo.order_id where vo.vendor_id = "vendors"."id" and vo.status <> 'cancelled' and o.payment_status = 'paid'), 0)::float8`,
      shipmentCount: sql<number>`(select count(*) from vendor_orders vo where vo.vendor_id = "vendors"."id")::int`,
      pendingCount: sql<number>`(select count(*) from vendor_orders vo where vo.vendor_id = "vendors"."id" and vo.status in ('new','accepted','packed'))::int`,
      deliveredCount: sql<number>`(select count(*) from vendor_orders vo where vo.vendor_id = "vendors"."id" and vo.status = 'delivered')::int`,
      productCount: sql<number>`(select count(*) from products p where p.vendor_id = "vendors"."id" and p.status = 'active')::int`,
    })
    .from(vendors);
  return [...rows].sort((a, b) => b.revenueMinor - a.revenueMinor);
}

export interface CountrySalesRow {
  readonly countryCode: string;
  readonly revenueMinor: number;
  readonly vendorCount: number;
}

export function salesByCountry(rows: readonly VendorSalesRow[]): CountrySalesRow[] {
  const byCountry = new Map<string, CountrySalesRow>();
  for (const row of rows) {
    const current = byCountry.get(row.countryCode) ?? { countryCode: row.countryCode, revenueMinor: 0, vendorCount: 0 };
    byCountry.set(row.countryCode, {
      countryCode: row.countryCode,
      revenueMinor: current.revenueMinor + row.revenueMinor,
      vendorCount: current.vendorCount + 1,
    });
  }
  return [...byCountry.values()].sort((a, b) => b.revenueMinor - a.revenueMinor);
}

export async function listAllOrders(limit = 200) {
  const db = await getDb();
  return db.query.orders.findMany({
    orderBy: desc(orders.createdAt),
    limit,
    with: {
      customer: { columns: { name: true, email: true } },
      vendorOrders: { with: { vendor: { columns: { name: true } } } },
      items: { columns: { quantity: true } },
    },
  });
}

export async function getOrderForAdmin(orderId: string) {
  const db = await getDb();
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      customer: { columns: { name: true, email: true } },
      vendorOrders: { with: { vendor: { columns: { name: true, countryCode: true, city: true } }, items: true, events: true } },
    },
  });
  return order ?? null;
}

export async function listAllProducts() {
  const db = await getDb();
  return db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      image: sql<string | null>`${products.images} ->> 0`,
      priceMinor: products.priceMinor,
      currency: products.currency,
      stock: products.stock,
      status: products.status,
      createdAt: products.createdAt,
      vendorName: vendors.name,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(desc(products.createdAt))
    .limit(500);
}
