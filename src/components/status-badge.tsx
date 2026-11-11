import { FULFILLMENT_LABELS, ORDER_STATUS_LABELS, type FulfillmentStatus, type OrderStatus } from "@/lib/domain/fulfillment";

export type Tone = "neutral" | "signal" | "ok" | "dark" | "muted" | "warn";

/** Soft pill colours: tinted background, darker text and a status dot. */
const TONES: Readonly<Record<Tone, { pill: string; dot: string }>> = {
  neutral: { pill: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  warn: { pill: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  signal: { pill: "bg-brand-soft text-brand-dark", dot: "bg-brand" },
  dark: { pill: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
  ok: { pill: "bg-ok-soft text-ok", dot: "bg-ok" },
  muted: { pill: "bg-slate-100 text-slate-500 line-through", dot: "bg-slate-300" },
};

const FULFILLMENT_TONES: Readonly<Record<FulfillmentStatus, Tone>> = {
  new: "warn",
  accepted: "signal",
  packed: "signal",
  shipped: "dark",
  delivered: "ok",
  cancelled: "muted",
};

const ORDER_TONES: Readonly<Record<OrderStatus, Tone>> = {
  processing: "warn",
  partially_shipped: "signal",
  shipped: "dark",
  delivered: "ok",
  cancelled: "muted",
};

interface BadgeProps {
  tone: Tone;
  children: React.ReactNode;
}

export function Badge({ tone, children }: BadgeProps) {
  const style = TONES[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${style.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {children}
    </span>
  );
}

export function FulfillmentBadge({ status }: { status: FulfillmentStatus }) {
  return <Badge tone={FULFILLMENT_TONES[status]}>{FULFILLMENT_LABELS[status]}</Badge>;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_TONES[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}
