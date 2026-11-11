import "server-only";
import { byId, fromDoc, getDb } from "@/lib/db/client";
import type { FulfillmentEvent, FulfillmentStatus, Order, OrderItem, ProductStatus, VendorOrder } from "@/lib/db/schema";
import { groupBy } from "./group";

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
  const paid = { $eq: ["$paymentStatus", "paid"] };
  const [salesRows, customerCount, vendorCount, productCount, shipmentRows] = await Promise.all([
    db.orders
      .aggregate<{ total: number; count: number; paid: number }>([
        {
          $group: {
            _id: null,
            total: { $sum: { $cond: [paid, "$totalMinor", 0] } },
            count: { $sum: 1 },
            paid: { $sum: { $cond: [paid, 1, 0] } },
          },
        },
      ])
      .toArray(),
    db.users.countDocuments({ role: "customer" }),
    db.vendors.countDocuments(),
    db.products.countDocuments({ status: "active" }),
    db.vendorOrders.aggregate<{ _id: FulfillmentStatus; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
  ]);
  const sales = salesRows[0] ?? { total: 0, count: 0, paid: 0 };
  return {
    grossSalesMinor: sales.total,
    orderCount: sales.count,
    averageOrderMinor: sales.paid > 0 ? Math.round(sales.total / sales.paid) : 0,
    customerCount,
    vendorCount,
    productCount,
    shipments: shipmentRows.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), EMPTY_COUNTS),
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

interface VendorShipmentTotals {
  readonly _id: string;
  readonly revenueMinor: number;
  readonly shipmentCount: number;
  readonly pendingCount: number;
  readonly deliveredCount: number;
}

/** Sales and fulfilment health per vendor, highest revenue first. */
export async function listVendorSales(): Promise<VendorSalesRow[]> {
  const db = await getDb();
  const countIf = (condition: unknown) => ({ $sum: { $cond: [condition, 1, 0] } });
  const [vendorDocs, shipmentTotals, productTotals] = await Promise.all([
    db.vendors.find().toArray(),
    db.vendorOrders
      .aggregate<VendorShipmentTotals>([
        { $lookup: { from: "orders", localField: "orderId", foreignField: "_id", as: "order" } },
        { $set: { paid: { $in: ["paid", "$order.paymentStatus"] } } },
        {
          $group: {
            _id: "$vendorId",
            // Revenue counts shipments that were not cancelled, on orders that were paid.
            revenueMinor: { $sum: { $cond: [{ $and: ["$paid", { $ne: ["$status", "cancelled"] }] }, "$subtotalMinor", 0] } },
            shipmentCount: { $sum: 1 },
            pendingCount: countIf({ $in: ["$status", ["new", "accepted", "packed"]] }),
            deliveredCount: countIf({ $eq: ["$status", "delivered"] }),
          },
        },
      ])
      .toArray(),
    db.products.aggregate<{ _id: string; count: number }>([{ $match: { status: "active" } }, { $group: { _id: "$vendorId", count: { $sum: 1 } } }]).toArray(),
  ]);
  const shipments = new Map(shipmentTotals.map((row) => [row._id, row]));
  const products = new Map(productTotals.map((row) => [row._id, row.count]));
  const rows = vendorDocs.map((vendor): VendorSalesRow => {
    const totals = shipments.get(vendor._id);
    return {
      id: vendor._id,
      name: vendor.name,
      slug: vendor.slug,
      countryCode: vendor.countryCode,
      city: vendor.city,
      status: vendor.status,
      contactEmail: vendor.contactEmail,
      createdAt: vendor.createdAt,
      revenueMinor: totals?.revenueMinor ?? 0,
      shipmentCount: totals?.shipmentCount ?? 0,
      pendingCount: totals?.pendingCount ?? 0,
      deliveredCount: totals?.deliveredCount ?? 0,
      productCount: products.get(vendor._id) ?? 0,
    };
  });
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

const UNKNOWN_CUSTOMER = { name: "Deleted account", email: "" } as const;

export async function listAllOrders(limit = 200) {
  const db = await getDb();
  const orders = (await db.orders.find().sort({ createdAt: -1 }).limit(limit).toArray()).map((doc) => fromDoc<Order>(doc));
  const orderIds = orders.map((o) => o.id);
  const [customers, shipmentDocs, itemDocs] = await Promise.all([
    byId(db.users, orders.map((o) => o.customerId)),
    db.vendorOrders.find({ orderId: { $in: orderIds } }).sort({ createdAt: 1, _id: 1 }).toArray(),
    db.orderItems.find({ orderId: { $in: orderIds } }, { projection: { orderId: 1, quantity: 1 } }).toArray(),
  ]);
  const vendors = await byId(db.vendors, shipmentDocs.map((s) => s.vendorId));
  const shipments = groupBy(shipmentDocs.map((doc) => fromDoc<VendorOrder>(doc)), (s) => s.orderId);
  const items = groupBy(itemDocs, (i) => i.orderId);
  return orders.map((order) => {
    const customer = customers.get(order.customerId);
    return {
      ...order,
      customer: customer ? { name: customer.name, email: customer.email } : UNKNOWN_CUSTOMER,
      vendorOrders: (shipments.get(order.id) ?? []).map((s) => ({ ...s, vendor: { name: vendors.get(s.vendorId)?.name ?? "Vendor" } })),
      items: (items.get(order.id) ?? []).map((i) => ({ quantity: i.quantity })),
    };
  });
}

export async function getOrderForAdmin(orderId: string) {
  const db = await getDb();
  const orderDoc = await db.orders.findOne({ _id: orderId });
  if (!orderDoc) return null;
  const shipments = (await db.vendorOrders.find({ orderId }).sort({ createdAt: 1, _id: 1 }).toArray()).map((doc) => fromDoc<VendorOrder>(doc));
  const [customer, vendors, itemDocs, eventDocs] = await Promise.all([
    db.users.findOne({ _id: orderDoc.customerId }),
    byId(db.vendors, shipments.map((s) => s.vendorId)),
    db.orderItems.find({ orderId }).toArray(),
    db.fulfillmentEvents.find({ vendorOrderId: { $in: shipments.map((s) => s.id) } }).sort({ createdAt: 1 }).toArray(),
  ]);
  const items = groupBy(itemDocs.map((doc) => fromDoc<OrderItem>(doc)), (i) => i.vendorOrderId);
  const events = groupBy(eventDocs.map((doc) => fromDoc<FulfillmentEvent>(doc)), (e) => e.vendorOrderId);
  return {
    ...fromDoc<Order>(orderDoc),
    customer: customer ? { name: customer.name, email: customer.email } : UNKNOWN_CUSTOMER,
    vendorOrders: shipments.map((shipment) => {
      const vendor = vendors.get(shipment.vendorId);
      return {
        ...shipment,
        vendor: { name: vendor?.name ?? "Vendor", countryCode: vendor?.countryCode ?? "", city: vendor?.city ?? "" },
        items: items.get(shipment.id) ?? [],
        events: events.get(shipment.id) ?? [],
      };
    }),
  };
}

export interface AdminProductRow {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly image: string | null;
  readonly priceMinor: number;
  readonly currency: string;
  readonly stock: number;
  readonly status: ProductStatus;
  readonly createdAt: Date;
  readonly vendorName: string;
  readonly categoryName: string;
}

export async function listAllProducts(): Promise<AdminProductRow[]> {
  const db = await getDb();
  const docs = await db.products.find().sort({ createdAt: -1, _id: 1 }).limit(500).toArray();
  const [vendors, categories] = await Promise.all([
    byId(db.vendors, docs.map((p) => p.vendorId)),
    byId(db.categories, docs.map((p) => p.categoryId)),
  ]);
  return docs.map((p) => ({
    id: p._id,
    slug: p.slug,
    name: p.name,
    image: p.images[0] ?? null,
    priceMinor: p.priceMinor,
    currency: p.currency,
    stock: p.stock,
    status: p.status,
    createdAt: p.createdAt,
    vendorName: vendors.get(p.vendorId)?.name ?? "Vendor",
    categoryName: categories.get(p.categoryId)?.name ?? "",
  }));
}
