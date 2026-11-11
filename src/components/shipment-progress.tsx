import { Check, ClipboardCheck, Package, PackageCheck, Truck, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import type { FulfillmentStatus } from "@/lib/db/schema";

export const PROGRESS_STEPS: ReadonlyArray<{ status: FulfillmentStatus; label: string; icon: LucideIcon }> = [
  { status: "new", label: "Ordered", icon: ClipboardCheck },
  { status: "accepted", label: "Confirmed", icon: Check },
  { status: "packed", label: "Packed", icon: Package },
  { status: "shipped", label: "Shipped", icon: Truck },
  { status: "delivered", label: "Delivered", icon: PackageCheck },
];

/** Position of a status in the delivery flow, or -1 for a cancelled shipment. */
export function progressRank(status: FulfillmentStatus): number {
  return PROGRESS_STEPS.findIndex((step) => step.status === status);
}

/**
 * Five-step delivery tracker. The line fills one step at a time when the page
 * opens, and the step the shipment is waiting at pulses until it is delivered.
 */
export function ShipmentProgress({ status, className = "" }: { status: FulfillmentStatus; className?: string }) {
  const reached = progressRank(status);
  const finished = reached === PROGRESS_STEPS.length - 1;
  return (
    <ol className={`flex ${className}`} aria-label="Delivery progress">
      {PROGRESS_STEPS.map(({ status: step, label, icon: Icon }, index) => {
        const done = index <= reached;
        const current = index === reached;
        const order = { "--i": index } as CSSProperties;
        return (
          <li key={step} className="relative flex flex-1 flex-col items-center text-center" aria-current={current ? "step" : undefined}>
            {index > 0 ? (
              <span className="absolute right-1/2 top-[18px] h-0.5 w-full -translate-y-1/2 bg-line" aria-hidden="true">
                {done ? <span className="track-line block h-full w-full bg-ok" style={order} /> : null}
              </span>
            ) : null}
            <span
              className={`relative z-10 grid h-9 w-9 place-items-center rounded-full ${done ? "track-dot bg-ok text-white" : "bg-muted text-subtle"} ${current ? "ring-4 ring-ok/20" : ""} ${current && !finished ? "track-current" : ""}`}
              style={order}
            >
              <Icon size={17} aria-hidden="true" />
            </span>
            <span className={`mt-2 text-[10.5px] font-medium min-[380px]:text-[12px] sm:text-[13px] ${done ? "text-fg" : "text-subtle"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
