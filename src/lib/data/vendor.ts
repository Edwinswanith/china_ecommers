import "server-only";
import type { Filter } from "mongodb";
import { byId, fromDoc, getDb, type Doc } from "@/lib/db/client";
import type { FulfillmentEvent, FulfillmentStatus, Order, OrderItem, Product, VendorOrder } from "@/lib/db/schema";
import { groupBy } from "./group";

export const LOW_STOCK_THRESHOLD = 10;
const LIST_LIMIT = 200;

export interface VendorStats {
  readonly revenueMinor: number;
  readonly byStatus: Readonly<Record<FulfillmentStatus, number>>;
  readonly productCount: number;
  readonly lowStockCount: number;
}

const EMPTY_COUNTS: Record<FulfillmentStatus, number> = { new: 0, accepted: 0, packed: 0, shipped: 0, delivered: 0, cancelled: 0 };

export async function getVendorStats(vendorId: string): Promise<VendorStats> {
  const db = await getDb();
  const [statusRows, revenueRows, productCount, lowStockCount] = await Promise.all([
    db.vendorOrders
      .aggregate<{ _id: FulfillmentStatus; count: number }>([{ $match: { vendorId } }, { $group: { _id: "$status", count: { $sum: 1 } } }])
      .toArray(),
    // Revenue counts shipments that were not cancelled, on orders that were paid.
    db.vendorOrders
      .aggregate<{ total: number }>([
        { $match: { vendorId, status: { $ne: "cancelled" } } },
        { $lookup: { from: "orders", localField: "orderId", foreignField: "_id", as: "order" } },
        { $match: { "order.paymentStatus": "paid" } },
        { $group: { _id: null, total: { $sum: "$subtotalMinor" } } },
      ])
      .toArray(),
    db.products.countDocuments({ vendorId, status: { $ne: "archived" } }),
    db.products.countDocuments({ vendorId, status: "active", stock: { $lte: LOW_STOCK_THRESHOLD } }),
  ]);
  const byStatus = statusRows.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), EMPTY_COUNTS);
  return { revenueMinor: revenueRows[0]?.total ?? 0, byStatus, productCount, lowStockCount };
}

type OrderSummary = Pick<Order, "number" | "createdAt" | "shippingAddress" | "paymentStatus" | "currency">;

function summarise(order: Order | undefined): OrderSummary {
  if (!order) throw new Error("A shipment refers to an order that no longer exists.");
  return {
    number: order.number,
    createdAt: order.createdAt,
    shippingAddress: order.shippingAddress,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
  };
}

export async function listVendorOrders(vendorId: string, statuses?: readonly FulfillmentStatus[]) {
  const db = await getDb();
  const filter: Filter<Doc<VendorOrder>> = statuses && statuses.length > 0 ? { vendorId, status: { $in: [...statuses] } } : { vendorId };
  const shipments = (await db.vendorOrders.find(filter).sort({ createdAt: -1 }).limit(LIST_LIMIT).toArray()).map((doc) => fromDoc<VendorOrder>(doc));
  const [orders, itemDocs] = await Promise.all([
    byId(db.orders, shipments.map((s) => s.orderId)),
    db.orderItems.find({ vendorOrderId: { $in: shipments.map((s) => s.id) } }).toArray(),
  ]);
  const items = groupBy(itemDocs.map((doc) => fromDoc<OrderItem>(doc)), (i) => i.vendorOrderId);
  return shipments.map((shipment) => ({ ...shipment, order: summarise(orders.get(shipment.orderId)), items: items.get(shipment.id) ?? [] }));
}

/** Scoped by vendorId so a vendor can never read another vendor's shipment. */
export async function getVendorOrder(vendorOrderId: string, vendorId: string) {
  const db = await getDb();
  const doc = await db.vendorOrders.findOne({ _id: vendorOrderId, vendorId });
  if (!doc) return null;
  const [orderDoc, itemDocs, eventDocs] = await Promise.all([
    db.orders.findOne({ _id: doc.orderId }),
    db.orderItems.find({ vendorOrderId }).toArray(),
    db.fulfillmentEvents.find({ vendorOrderId }).sort({ createdAt: 1 }).toArray(),
  ]);
  return {
    ...fromDoc<VendorOrder>(doc),
    order: summarise(orderDoc ? fromDoc<Order>(orderDoc) : undefined),
    items: itemDocs.map((item) => fromDoc<OrderItem>(item)),
    events: eventDocs.map((event) => fromDoc<FulfillmentEvent>(event)),
  };
}

export async function listVendorProducts(vendorId: string): Promise<Product[]> {
  const db = await getDb();
  const docs = await db.products.find({ vendorId, status: { $ne: "archived" } }).sort({ createdAt: -1 }).toArray();
  return docs.map((doc) => fromDoc<Product>(doc));
}

export async function getVendorProduct(productId: string, vendorId: string): Promise<Product | null> {
  const db = await getDb();
  const doc = await db.products.findOne({ _id: productId, vendorId });
  return doc ? fromDoc<Product>(doc) : null;
}
