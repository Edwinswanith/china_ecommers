import { CircleCheckBig } from "lucide-react";
import { countryName } from "@/lib/config/markets";
import type { FulfillmentStatus, OrderItem, VendorOrder } from "@/lib/db/schema";
import { FULFILLMENT_LABELS } from "@/lib/domain/fulfillment";
import { formatMoney } from "@/lib/domain/money";
import { formatDateTime, formatWeight } from "@/lib/format";
import { ProductImage } from "./product-image";
import { progressRank, ShipmentProgress } from "./shipment-progress";
import { FulfillmentBadge } from "./status-badge";
import { ChangeFlash } from "./ui/change-flash";

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
  const cancelled = shipment.status === "cancelled";
  // Newest first; events logged in the same instant fall back to their natural order in the flow.
  const events = [...shipment.events].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || progressRank(b.status) - progressRank(a.status));
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
        <ChangeFlash watch={shipment.status}><FulfillmentBadge status={shipment.status} /></ChangeFlash>
      </header>

      {cancelled ? (
        <p className="border-b border-line bg-muted px-5 py-3 text-[14px] text-subtle">This delivery was cancelled.</p>
      ) : (
        <ShipmentProgress status={shipment.status} className="border-b border-line px-1 py-5 min-[380px]:px-3 sm:px-5" />
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
