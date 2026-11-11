import "server-only";
import { byId, fromDoc, getDb } from "@/lib/db/client";
import type { FulfillmentEvent, Order, OrderItem, VendorOrder } from "@/lib/db/schema";
import type { PurchaseRecord } from "@/lib/domain/reviews";
import { groupBy } from "./group";

export async function listOrdersForCustomer(customerId: string) {
  const db = await getDb();
  const orders = (await db.orders.find({ customerId }).sort({ createdAt: -1 }).toArray()).map((doc) => fromDoc<Order>(doc));
  const orderIds = orders.map((o) => o.id);
  const [shipmentDocs, itemDocs] = await Promise.all([
    db.vendorOrders.find({ orderId: { $in: orderIds } }).sort({ createdAt: 1, _id: 1 }).toArray(),
    db.orderItems.find({ orderId: { $in: orderIds } }).toArray(),
  ]);
  const shipments = groupBy(shipmentDocs, (s) => s.orderId);
  const items = groupBy(itemDocs.map((doc) => fromDoc<OrderItem>(doc)), (i) => i.orderId);
  return orders.map((order) => ({
    ...order,
    vendorOrders: (shipments.get(order.id) ?? []).map((s) => ({ id: s._id, status: s.status })),
    items: items.get(order.id) ?? [],
  }));
}

export async function getOrderForCustomer(orderId: string, customerId: string) {
  const db = await getDb();
  const orderDoc = await db.orders.findOne({ _id: orderId, customerId });
  if (!orderDoc) return null;
  const shipments = (await db.vendorOrders.find({ orderId }).sort({ createdAt: 1, _id: 1 }).toArray()).map((doc) => fromDoc<VendorOrder>(doc));
  const shipmentIds = shipments.map((s) => s.id);
  const [itemDocs, eventDocs, vendors] = await Promise.all([
    db.orderItems.find({ orderId }).toArray(),
    db.fulfillmentEvents.find({ vendorOrderId: { $in: shipmentIds } }).sort({ createdAt: 1 }).toArray(),
    byId(db.vendors, shipments.map((s) => s.vendorId)),
  ]);
  const products = await byId(db.products, itemDocs.map((i) => i.productId));
  const items = groupBy(itemDocs.map((doc) => fromDoc<OrderItem>(doc)), (i) => i.vendorOrderId);
  const events = groupBy(eventDocs.map((doc) => fromDoc<FulfillmentEvent>(doc)), (e) => e.vendorOrderId);

  return {
    ...fromDoc<Order>(orderDoc),
    vendorOrders: shipments.map((shipment) => {
      const vendor = vendors.get(shipment.vendorId);
      return {
        ...shipment,
        vendor: { name: vendor?.name ?? "Vendor", slug: vendor?.slug ?? "", countryCode: vendor?.countryCode ?? "", city: vendor?.city ?? "" },
        items: (items.get(shipment.id) ?? []).map((item) => ({ ...item, product: { slug: products.get(item.productId)?.slug ?? "" } })),
        events: events.get(shipment.id) ?? [],
      };
    }),
  };
}

export type CustomerOrder = NonNullable<Awaited<ReturnType<typeof getOrderForCustomer>>>;

/** Everything needed to decide whether this user may review this product. */
export async function getReviewContext(
  userId: string,
  productId: string,
): Promise<{ purchases: PurchaseRecord[]; alreadyReviewed: boolean }> {
  const db = await getDb();
  // Only this user's own orders count.
  const [orderDocs, existing] = await Promise.all([
    db.orders.find({ customerId: userId }, { projection: { paymentStatus: 1 } }).toArray(),
    db.reviews.findOne({ userId, productId }, { projection: { _id: 1 } }),
  ]);
  const orders = new Map(orderDocs.map((o) => [o._id, o]));
  const itemDocs = await db.orderItems.find({ productId, orderId: { $in: [...orders.keys()] } }).toArray();
  const shipments = await byId(db.vendorOrders, itemDocs.map((i) => i.vendorOrderId));
  const purchases = itemDocs.flatMap((item): PurchaseRecord[] => {
    const order = orders.get(item.orderId);
    const shipment = shipments.get(item.vendorOrderId);
    if (!order || !shipment) return [];
    return [{ orderItemId: item._id, productId: item.productId, fulfillmentStatus: shipment.status, paid: order.paymentStatus === "paid" }];
  });
  return { purchases, alreadyReviewed: existing !== null };
}
