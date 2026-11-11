import { BadgeCheck, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import type { ProductListing, PublicReview } from "@/lib/data/catalog";
import { getReviewContext } from "@/lib/data/orders";
import { findReviewablePurchase, ratingAverage, REVIEW_BLOCK_MESSAGES } from "@/lib/domain/reviews";
import { formatDate } from "@/lib/format";
import { Stars } from "./rating";
import { ReviewForm } from "./review-form";

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-muted p-4 text-[14.5px] leading-relaxed text-subtle">{children}</p>;
}

/** Decides, on the server, whether this visitor may review the product. */
async function ReviewGate({ product }: { product: ProductListing }) {
  const session = await getSession();
  if (!session) {
    return (
      <Note>
        Bought this product?{" "}
        <Link href={`/login?next=${encodeURIComponent(`/products/${product.slug}#reviews`)}`} className="link">Sign in</Link> to write a review. Only verified buyers can post reviews.
      </Note>
    );
  }
  if (session.role !== "customer") return <Note>Reviews can only be written from customer accounts.</Note>;
  const context = await getReviewContext(session.userId, product.id);
  const eligibility = findReviewablePurchase(product.id, context.purchases, context.alreadyReviewed);
  if (!eligibility.ok) return <Note>{REVIEW_BLOCK_MESSAGES[eligibility.reason]}</Note>;
  return <ReviewForm productId={product.id} />;
}

interface ProductReviewsProps {
  product: ProductListing;
  reviews: readonly PublicReview[];
}

export function ProductReviews({ product, reviews }: ProductReviewsProps) {
  const average = ratingAverage(product.ratingSum, product.ratingCount);
  return (
    <section id="reviews" className="scroll-mt-44" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="display mb-6 text-2xl md:text-[1.9rem]">Customer reviews</h2>
      <div className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-12">
        <div className="space-y-5">
          <div className="rounded-2xl border border-line p-6">
            {average !== null ? (
              <div className="flex items-center gap-4">
                <span className="num text-5xl font-bold tracking-tight">{average.toFixed(1)}</span>
                <div>
                  <Stars value={average} size={19} />
                  <p className="mt-1 text-[14px] text-subtle">Based on {product.ratingCount} verified {product.ratingCount === 1 ? "review" : "reviews"}</p>
                </div>
              </div>
            ) : (
              <p className="text-[15px] text-subtle">No reviews yet. Reviews appear here once customers receive their orders.</p>
            )}
            <p className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-[13.5px] text-subtle">
              <BadgeCheck size={17} className="mt-px shrink-0 text-ok" aria-hidden="true" />
              Every review is from a customer whose order was delivered.
            </p>
          </div>
          <ReviewGate product={product} />
        </div>

        {reviews.length === 0 ? (
          <div className="grid place-items-center rounded-2xl bg-muted px-6 py-14 text-center">
            <div>
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-subtle shadow-sm"><MessageSquareText size={21} aria-hidden="true" /></span>
              <p className="mt-3 font-semibold">Be the first to review this product</p>
              <p className="mt-1 text-[14.5px] text-subtle">Order {product.name} and share what you think once it arrives.</p>
            </div>
          </div>
        ) : (
          <ul className="space-y-4">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-2xl border border-line p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-[15px] font-bold text-brand-dark" aria-hidden="true">{review.authorName[0]}</span>
                    <div>
                      <p className="text-[14.5px] font-semibold">{review.authorName}</p>
                      <p className="flex items-center gap-1 text-[12.5px] font-medium text-ok"><BadgeCheck size={14} aria-hidden="true" /> Verified purchase</p>
                    </div>
                  </div>
                  <time dateTime={review.createdAt.toISOString()} className="text-[13px] text-subtle">{formatDate(review.createdAt)}</time>
                </div>
                <div className="mt-4"><Stars value={review.rating} /></div>
                <h3 className="mt-2 text-[16px] font-semibold">{review.title}</h3>
                <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-subtle">{review.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
