"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { getReviewContext } from "@/lib/data/orders";
import { getDb } from "@/lib/db/client";
import { products, reviews } from "@/lib/db/schema";
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
    const slug = await db.transaction(async (tx) => {
      await tx.insert(reviews).values({ productId, userId: session.userId, orderItemId: eligibility.orderItemId, rating, title, body });
      const [updated] = await tx
        .update(products)
        .set({ ratingSum: sql`${products.ratingSum} + ${rating}`, ratingCount: sql`${products.ratingCount} + 1` })
        .where(eq(products.id, productId))
        .returning({ slug: products.slug });
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
