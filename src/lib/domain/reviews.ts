import type { FulfillmentStatus } from "./fulfillment";

export interface PurchaseRecord {
  readonly orderItemId: string;
  readonly productId: string;
  readonly fulfillmentStatus: FulfillmentStatus;
  readonly paid: boolean;
}

export type ReviewBlockReason = "not_purchased" | "not_delivered" | "already_reviewed";

export type ReviewEligibility =
  | { readonly ok: true; readonly orderItemId: string }
  | { readonly ok: false; readonly reason: ReviewBlockReason };

export const REVIEW_BLOCK_MESSAGES: Readonly<Record<ReviewBlockReason, string>> = {
  not_purchased: "Only customers who bought this product can review it.",
  not_delivered: "You can review this product once your order has been delivered.",
  already_reviewed: "You have already reviewed this product.",
};

/**
 * A review is allowed only when the user has a paid, delivered purchase of
 * the product and has not reviewed it before.
 */
export function findReviewablePurchase(
  productId: string,
  purchases: readonly PurchaseRecord[],
  alreadyReviewed: boolean,
): ReviewEligibility {
  if (alreadyReviewed) return { ok: false, reason: "already_reviewed" };
  const mine = purchases.filter((p) => p.productId === productId);
  if (mine.length === 0) return { ok: false, reason: "not_purchased" };
  const delivered = mine.find((p) => p.paid && p.fulfillmentStatus === "delivered");
  if (!delivered) return { ok: false, reason: "not_delivered" };
  return { ok: true, orderItemId: delivered.orderItemId };
}

export function ratingAverage(ratingSum: number, ratingCount: number): number | null {
  if (ratingCount <= 0) return null;
  return Math.round((ratingSum / ratingCount) * 10) / 10;
}
