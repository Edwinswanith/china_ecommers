import { randomInt } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import type { OrderDraft } from "@/lib/domain/cart";
import type { Db } from "./client";
import { fulfillmentEvents, orderItems, orders, products, vendorOrders, type ShippingAddress } from "./schema";

export interface PaymentResult {
  readonly provider: string;
  readonly reference: string | null;
  readonly status: "pending" | "paid" | "failed";
}

export interface NewOrderInput {
  readonly customerId: string;
  readonly marketCountry: string;
  readonly draft: OrderDraft;
  readonly shippingAddress: ShippingAddress;
  readonly payment: PaymentResult;
}

export interface CreatedOrder {
  readonly id: string;
  readonly number: string;
  readonly vendorOrderIds: readonly string[];
}

export class OutOfStockError extends Error {
  constructor(productName: string) {
    super(`${productName} just sold out. Please update your cart.`);
    this.name = "OutOfStockError";
  }
}

const NUMBER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateOrderNumber(): string {
  const chars = Array.from({ length: 8 }, () => NUMBER_ALPHABET[randomInt(NUMBER_ALPHABET.length)]);
  return `CS-${chars.join("")}`;
}

/**
 * Persist an order atomically: the order, one vendor order per shipment,
 * the line items, the first timeline event, and the stock decrement.
 * Stock is decremented with a guarded UPDATE so two buyers cannot both
 * take the last unit.
 */
export async function insertOrder(db: Db, input: NewOrderInput): Promise<CreatedOrder> {
  const { draft } = input;
  return db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        number: generateOrderNumber(),
        customerId: input.customerId,
        marketCountry: input.marketCountry,
        currency: draft.currency,
        subtotalMinor: draft.subtotalMinor,
        shippingMinor: draft.shippingMinor,
        dutiesMinor: draft.dutiesMinor,
        totalMinor: draft.totalMinor,
        paymentStatus: input.payment.status,
        paymentProvider: input.payment.provider,
        paymentRef: input.payment.reference,
        shippingAddress: input.shippingAddress,
      })
      .returning({ id: orders.id, number: orders.number });

    const vendorOrderIds: string[] = [];
    for (const shipment of draft.shipments) {
      const [vendorOrder] = await tx
        .insert(vendorOrders)
        .values({ orderId: order.id, vendorId: shipment.vendorId, subtotalMinor: shipment.subtotalMinor })
        .returning({ id: vendorOrders.id });
      vendorOrderIds.push(vendorOrder.id);

      await tx.insert(fulfillmentEvents).values({ vendorOrderId: vendorOrder.id, status: "new", note: "Order placed" });
      await tx.insert(orderItems).values(
        shipment.items.map((item) => ({
          orderId: order.id,
          vendorOrderId: vendorOrder.id,
          productId: item.productId,
          name: item.name,
          image: item.image,
          unitPriceMinor: item.unitPriceMinor,
          quantity: item.quantity,
        })),
      );

      for (const item of shipment.items) {
        const updated = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${item.quantity}` })
          .where(and(eq(products.id, item.productId), gte(products.stock, item.quantity)))
          .returning({ id: products.id });
        if (updated.length === 0) throw new OutOfStockError(item.name);
      }
    }
    return { id: order.id, number: order.number, vendorOrderIds };
  });
}
