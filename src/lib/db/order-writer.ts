import { randomInt } from "node:crypto";
import type { OrderDraft } from "@/lib/domain/cart";
import { newId, withTransaction, type Db } from "./client";
import type { ShippingAddress } from "./schema";

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
 * Stock is decremented with a guarded update so two buyers cannot both
 * take the last unit.
 */
export async function insertOrder(db: Db, input: NewOrderInput): Promise<CreatedOrder> {
  const { draft } = input;
  return withTransaction(db, async (tx) => {
    const session = tx;
    const now = new Date();
    const orderId = newId();
    const number = generateOrderNumber();
    await db.orders.insertOne(
      {
        _id: orderId,
        number,
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
        createdAt: now,
      },
      { session },
    );

    const vendorOrderIds: string[] = [];
    for (const shipment of draft.shipments) {
      const vendorOrderId = newId();
      vendorOrderIds.push(vendorOrderId);
      await db.vendorOrders.insertOne(
        {
          _id: vendorOrderId,
          orderId,
          vendorId: shipment.vendorId,
          status: "new",
          subtotalMinor: shipment.subtotalMinor,
          packageCount: null,
          weightGrams: null,
          lengthCm: null,
          widthCm: null,
          heightCm: null,
          carrier: null,
          trackingNumber: null,
          vendorNote: null,
          createdAt: now,
          updatedAt: now,
          shippedAt: null,
          deliveredAt: null,
        },
        { session },
      );
      await db.fulfillmentEvents.insertOne({ _id: newId(), vendorOrderId, status: "new", note: "Order placed", createdAt: now }, { session });
      await db.orderItems.insertMany(
        shipment.items.map((item) => ({
          _id: newId(),
          orderId,
          vendorOrderId,
          productId: item.productId,
          name: item.name,
          image: item.image,
          unitPriceMinor: item.unitPriceMinor,
          quantity: item.quantity,
        })),
        { session },
      );

      for (const item of shipment.items) {
        const updated = await db.products.updateOne(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session },
        );
        if (updated.matchedCount === 0) throw new OutOfStockError(item.name);
      }
    }
    return { id: orderId, number, vendorOrderIds };
  });
}
