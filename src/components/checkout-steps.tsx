import { Check } from "lucide-react";

const STEPS = ["Cart", "Delivery and payment", "Order placed"] as const;

/** Progress indicator shown across the cart, checkout and confirmation pages. */
export function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2 text-[13.5px] font-medium sm:gap-3" aria-label="Checkout progress">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3" aria-current={active ? "step" : undefined}>
            <span className={`num grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12.5px] font-bold transition-colors ${done ? "bg-ok text-white" : active ? "bg-brand text-white" : "bg-muted text-subtle"}`}>
              {done ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : step}
            </span>
            <span className={`${active ? "text-fg" : "text-subtle"} ${active ? "" : "hidden sm:inline"}`}>{label}</span>
            {step < STEPS.length ? <span className={`h-px w-6 sm:w-10 ${done ? "bg-ok" : "bg-line"}`} aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
