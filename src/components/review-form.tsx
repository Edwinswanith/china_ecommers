"use client";

import { Star } from "lucide-react";
import { useActionState, useState } from "react";
import { submitReviewAction } from "@/lib/actions/reviews";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import { TextAreaField, TextField } from "./forms/field";
import { FormMessage } from "./forms/form-message";
import { SubmitButton } from "./forms/submit-button";

const RATING_WORDS = ["Tap a star to rate", "Poor", "Fair", "Good", "Very good", "Excellent"];

export function ReviewForm({ productId }: { productId: string }) {
  const [state, action] = useActionState(submitReviewAction, EMPTY_FORM_STATE);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;

  if (state.ok) return <FormMessage state={state} />;

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-line p-5">
      <h3 className="text-[17px] font-semibold tracking-tight">Write a review</h3>
      <input type="hidden" name="productId" value={productId} />
      <fieldset>
        <legend className="field-label">Your rating</legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="cursor-pointer rounded-md p-0.5 transition-transform hover:scale-110 active:scale-95" onMouseEnter={() => setHover(value)}>
              <input type="radio" name="rating" value={value} className="peer sr-only" checked={rating === value} onChange={() => setRating(value)} required />
              <Star size={30} aria-hidden="true" className={`transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand ${value <= shown ? "fill-star text-star" : "fill-line text-line"}`} />
              <span className="sr-only">{value} star{value > 1 ? "s" : ""}</span>
            </label>
          ))}
          <span className="ml-2 text-[14px] text-subtle">{RATING_WORDS[shown]}</span>
        </div>
        {state.fieldErrors?.rating ? <p role="alert" className="mt-1.5 text-[13px] font-medium text-danger">{state.fieldErrors.rating}</p> : null}
      </fieldset>
      <TextField label="Headline" name="title" maxLength={80} required placeholder="Sum it up in a few words" error={state.fieldErrors?.title} />
      <TextAreaField label="Your review" name="body" maxLength={1500} required placeholder="What did you like or dislike? How are you using it?" error={state.fieldErrors?.body} />
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full" pendingLabel="Posting…">Post review</SubmitButton>
    </form>
  );
}
