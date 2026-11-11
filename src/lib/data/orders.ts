import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { orderItems, orders, reviews, vendorOrders } from "@/lib/db/schema";
import type { PurchaseRecord } from "@/lib/domain/reviews";

export async function listOrdersForCustomer(customerId: string) {
  const db = await getDb();
  return db.query.orders.findMany({
    where: eq(orders.customerId, customerId),
    orderBy: desc(orders.createdAt),
    with: { vendorOrders: { columns: { id: true, status: true } }, items: true },
  });
}

export async function getOrderForCustomer(orderId: string, customerId: string) {
  const db = await getDb();
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.customerId, customerId)),
    with: {
      vendorOrders: {
        with: {
          vendor: { columns: { name: true, slug: true, countryCode: true, city: true } },
          items: { with: { product: { columns: { slug: true } } } },
          events: true,
        },
      },
    },
  });
  return order ?? null;
}

export type CustomerOrder = NonNullable<Awaited<ReturnType<typeof getOrderForCustomer>>>;

/** Everything needed to decide whether this user may review this product. */
export async function getReviewContext(
  userId: string,
  productId: string,
): Promise<{ purchases: PurchaseRecord[]; alreadyReviewed: boolean }> {
  const db = await getDb();
  const [purchaseRows, existing] = await Promise.all([
    db
      .select({ orderItemId: orderItems.id, productId: orderItems.productId, fulfillmentStatus: vendorOrders.status, paymentStatus: orders.paymentStatus })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(vendorOrders, eq(orderItems.vendorOrderId, vendorOrders.id))
      .where(and(eq(orders.customerId, userId), eq(orderItems.productId, productId))),
    db.select({ id: reviews.id }).from(reviews).where(and(eq(reviews.userId, userId), eq(reviews.productId, productId))).limit(1),
  ]);
  return {
    purchases: purchaseRows.map((p) => ({
      orderItemId: p.orderItemId,
      productId: p.productId,
      fulfillmentStatus: p.fulfillmentStatus,
      paid: p.paymentStatus === "paid",
    })),
    alreadyReviewed: existing.length > 0,
  };
}
