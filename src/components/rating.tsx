import { Star } from "lucide-react";
import { ratingAverage } from "@/lib/domain/reviews";

interface StarsProps {
  value: number;
  size?: number;
}

export function Stars({ value, size = 15 }: StarsProps) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={size} aria-hidden="true" className={star <= rounded ? "fill-star text-star" : "fill-line text-line"} />
      ))}
    </span>
  );
}

interface RatingSummaryProps {
  ratingSum: number;
  ratingCount: number;
  /** Compact form for product cards: one star, the average and the count. */
  compact?: boolean;
}

export function RatingSummary({ ratingSum, ratingCount, compact = false }: RatingSummaryProps) {
  const average = ratingAverage(ratingSum, ratingCount);
  if (average === null) return compact ? <span className="text-[13px] text-subtle">New</span> : <span className="text-[14px] text-subtle">No reviews yet</span>;
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-[13px]" aria-label={`Rated ${average} out of 5 by ${ratingCount} buyers`}>
        <Star size={14} className="fill-star text-star" aria-hidden="true" />
        <span className="num font-semibold">{average.toFixed(1)}</span>
        <span className="num text-subtle">({ratingCount})</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Stars value={average} />
      <span className="num text-[14px] font-semibold">{average.toFixed(1)}</span>
      <span className="text-[14px] text-subtle">
        {ratingCount} verified {ratingCount === 1 ? "review" : "reviews"}
      </span>
    </span>
  );
}
