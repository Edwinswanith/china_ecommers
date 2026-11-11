import "server-only";
import { randomUUID } from "node:crypto";
import type { PaymentResult } from "@/lib/db/order-writer";

/**
 * PLACEHOLDER payment provider. It approves every charge without moving money.
 * To go live, implement `charge` against the real gateway (e.g. Razorpay:
 * create an order, verify the signature in a webhook) and return its result.
 * Nothing else in the checkout needs to change.
 */
export interface PaymentRequest {
  readonly amountMinor: number;
  readonly currency: string;
  readonly customerId: string;
}

export const PAYMENT_PROVIDER = "placeholder";
export const PAYMENTS_ARE_LIVE = false;

export async function charge(request: PaymentRequest): Promise<PaymentResult> {
  if (request.amountMinor <= 0) return { provider: PAYMENT_PROVIDER, reference: null, status: "failed" };
  return { provider: PAYMENT_PROVIDER, reference: `test_${randomUUID()}`, status: "paid" };
}
