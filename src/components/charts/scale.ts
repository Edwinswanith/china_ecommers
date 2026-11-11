import { CURRENCIES } from "@/lib/config/markets";

/** Axis maximums whose quarter steps need at most two decimals, so gridline labels are exact. */
const TIDY_MULTIPLES = [1, 2, 3, 4, 5, 6, 8, 10] as const;

/** Round an axis maximum up to a tidy number: one of TIDY_MULTIPLES times a power of ten. */
export function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const multiple = TIDY_MULTIPLES.find((candidate) => candidate * magnitude >= value) ?? 10;
  return multiple * magnitude;
}

const COMPACT_STEPS: ReadonlyArray<readonly [threshold: number, suffix: string]> = [
  [10_000_000, "Cr"],
  [100_000, "L"],
  [1_000, "K"],
];

/**
 * Short axis label for a minor-unit amount in the Indian style, e.g. "₹1.5L" or "₹50K".
 * Written by hand rather than with Intl compact notation, which formats differently
 * on the server and in some browsers and would make the page re-render.
 */
export function compactMoney(amountMinor: number, currencyCode: string): string {
  const currency = CURRENCIES[currencyCode];
  if (!currency) throw new Error(`Unsupported currency: ${currencyCode}`);
  const amount = amountMinor / 10 ** currency.minorUnits;
  const step = COMPACT_STEPS.find(([threshold]) => Math.abs(amount) >= threshold);
  if (!step) return `${currency.symbol}${Math.round(amount)}`;
  const [threshold, suffix] = step;
  const scaled = Math.round((amount / threshold) * 100) / 100;
  return `${currency.symbol}${scaled}${suffix}`;
}
