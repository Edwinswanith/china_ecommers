"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { getReviewContext } from "@/lib/data/orders";
import { getDb, newId, withTransaction } from "@/lib/db/client";
import { findReviewablePurchase, REVIEW_BLOCK_MESSAGES } from "@/lib/domain/reviews";
import { zodFormState, type FormState } from "@/lib/form-state";
import { reviewSchema } from "@/lib/validation/schemas";

export async function submitReviewAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Sign in to write a review." };

  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodFormState(parsed.error);
  const { productId, rating, title, body } = parsed.data;

  // Eligibility is re-checked on the server: the form being visible proves nothing.
  const context = await getReviewContext(session.userId, productId);
  const eligibility = findReviewablePurchase(productId, context.purchases, context.alreadyReviewed);
  if (!eligibility.ok) return { ok: false, message: REVIEW_BLOCK_MESSAGES[eligibility.reason] };

  const db = await getDb();
  try {
    // The review and the product's rating totals are saved together or not at all.
    const slug = await withTransaction(db, async (tx) => {
      await db.reviews.insertOne(
        { _id: newId(), productId, userId: session.userId, orderItemId: eligibility.orderItemId, rating, title, body, createdAt: new Date() },
        { session: tx },
      );
      const updated = await db.products.findOneAndUpdate(
        { _id: productId },
        { $inc: { ratingSum: rating, ratingCount: 1 } },
        { session: tx, projection: { slug: 1 } },
      );
      if (!updated) throw new Error(`Reviewed product ${productId} no longer exists.`);
      return updated.slug;
    });
    revalidatePath(`/products/${slug}`);
    return { ok: true, message: "Thank you. Your verified review is now live." };
  } catch (error: unknown) {
    // The unique index (product, user) guards against a double submit.
    console.error("submitReviewAction failed", error);
    return { ok: false, message: "Your review could not be saved. You may have already reviewed this product." };
  }
}
