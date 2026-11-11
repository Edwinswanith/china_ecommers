import { Check, CircleCheckBig, ClipboardCheck, Package, PackageCheck, Truck, type LucideIcon } from "lucide-react";
import { countryName } from "@/lib/config/markets";
import type { FulfillmentStatus, OrderItem, VendorOrder } from "@/lib/db/schema";
import { FULFILLMENT_LABELS } from "@/lib/domain/fulfillment";
import { formatMoney } from "@/lib/domain/money";
import { formatDateTime, formatWeight } from "@/lib/format";
import { ProductImage } from "./product-image";
import { FulfillmentBadge } from "./status-badge";

const STEPS: ReadonlyArray<{ status: FulfillmentStatus; label: string; icon: LucideIcon }> = [
  { status: "new", label: "Ordered", icon: ClipboardCheck },
  { status: "accepted", label: "Confirmed", icon: Check },
  { status: "packed", label: "Packed", icon: Package },
  { status: "shipped", label: "Shipped", icon: Truck },
  { status: "delivered", label: "Delivered", icon: PackageCheck },
];

interface ShipmentCardProps {
  index: number;
  total: number;
  currency: string;
  shipment: VendorOrder & {
    vendor: { name: string; countryCode: string; city: string };
    items: OrderItem[];
    events: Array<{ id: string; status: FulfillmentStatus; note: string | null; createdAt: Date }>;
  };
}

/** One seller's part of an order: items, progress tracker, package and tracking details. */
export function ShipmentCard({ index, total, currency, shipment }: ShipmentCardProps) {
  const reached = STEPS.findIndex((s) => s.status === shipment.status);
  const cancelled = shipment.status === "cancelled";
  // Newest first; events logged in the same instant fall back to their natural order in the flow.
  const rank = (status: FulfillmentStatus): number => STEPS.findIndex((s) => s.status === status);
  const events = [...shipment.events].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || rank(b.status) - rank(a.status));
  const hasPackage = shipment.packageCount !== null && shipment.weightGrams !== null;

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-card)]" aria-label={`Delivery ${index + 1} from ${shipment.vendor.name}`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="text-[13px] text-subtle">
            {total > 1 ? `Delivery ${index + 1} of ${total} · ` : ""}Ships from {shipment.vendor.city}, {countryName(shipment.vendor.countryCode)}
          </p>
          <h3 className="mt-0.5 text-[17px] font-semibold tracking-tight">Sold by {shipment.vendor.name}</h3>
        </div>
        <FulfillmentBadge status={shipment.status} />
      </header>

      {cancelled ? (
        <p className="border-b border-line bg-muted px-5 py-3 text-[14px] text-subtle">This delivery was cancelled.</p>
      ) : (
        <ol className="flex border-b border-line px-3 py-5 sm:px-5" aria-label="Delivery progress">
          {STEPS.map(({ status, label, icon: Icon }, i) => {
            const done = i <= reached;
            return (
              <li key={status} className="relative flex flex-1 flex-col items-center text-center" aria-current={i === reached ? "step" : undefined}>
                {i > 0 ? <span className={`absolute right-1/2 top-[18px] h-0.5 w-full -translate-y-1/2 ${done ? "bg-ok" : "bg-line"}`} aria-hidden="true" /> : null}
                <span className={`relative z-10 grid h-9 w-9 place-items-center rounded-full transition-colors ${done ? "bg-ok text-white" : "bg-muted text-subtle"} ${i === reached ? "ring-4 ring-ok/20" : ""}`}>
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span className={`mt-2 text-[12px] font-medium sm:text-[13px] ${done ? "text-fg" : "text-subtle"}`}>{label}</span>
              </li>
            );
          })}
        </ol>
      )}

      <ul className="divide-y divide-line px-5">
        {shipment.items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 py-4">
            <div className="w-14 shrink-0 overflow-hidden rounded-lg"><ProductImage src={item.image} alt="" sizes="56px" /></div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.name}</p>
              <p className="num text-[13.5px] text-subtle">Qty {item.quantity} · {formatMoney(item.unitPriceMinor, currency)} each</p>
            </div>
            <p className="num font-semibold">{formatMoney(item.unitPriceMinor * item.quantity, currency)}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-px border-t border-line bg-line sm:grid-cols-2">
        <div className="space-y-5 bg-white p-5">
          <div>
            <h4 className="text-[13px] font-semibold text-subtle">Tracking</h4>
            {shipment.trackingNumber ? (
              <p className="mt-1.5 text-[14.5px]">
                <span className="font-medium">{shipment.carrier || "Carrier"}</span> · <span className="num">{shipment.trackingNumber}</span>
              </p>
            ) : (
              <p className="mt-1.5 text-[14px] text-subtle">You will see the tracking number here once the seller ships your order.</p>
            )}
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-subtle">Package</h4>
            {hasPackage ? (
              <p className="num mt-1.5 text-[14.5px]">
                {shipment.packageCount} {shipment.packageCount === 1 ? "box" : "boxes"} · {formatWeight(shipment.weightGrams ?? 0)} · {shipment.lengthCm} × {shipment.widthCm} × {shipment.heightCm} cm
              </p>
            ) : (
              <p className="mt-1.5 text-[14px] text-subtle">Size and weight are added when the seller packs your order.</p>
            )}
          </div>
        </div>
        <div className="bg-white p-5">
          <h4 className="text-[13px] font-semibold text-subtle">Updates</h4>
          <ol className="mt-3 space-y-3">
            {events.map((event, i) => (
              <li key={event.id} className="flex gap-3 text-[14px]">
                <CircleCheckBig size={16} className={`mt-0.5 shrink-0 ${i === 0 ? "text-ok" : "text-line"}`} aria-hidden="true" />
                <span>
                  <span className={i === 0 ? "font-semibold" : "font-medium text-subtle"}>{event.status === "new" ? "Order placed" : FULFILLMENT_LABELS[event.status]}</span>
                  <span className="num block text-[12.5px] text-subtle">{formatDateTime(event.createdAt)}</span>
                  {event.note && event.status !== "new" ? <span className="mt-0.5 block text-subtle">“{event.note}”</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
