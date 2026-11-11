export type FulfillmentStatus = "new" | "accepted" | "packed" | "shipped" | "delivered" | "cancelled";
export type OrderStatus = "processing" | "partially_shipped" | "shipped" | "delivered" | "cancelled";

const TRANSITIONS: Readonly<Record<FulfillmentStatus, readonly FulfillmentStatus[]>> = {
  new: ["accepted", "cancelled"],
  accepted: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const FULFILLMENT_LABELS: Readonly<Record<FulfillmentStatus, string>> = {
  new: "New",
  accepted: "Accepted",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  processing: "Processing",
  partially_shipped: "Partially shipped",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Statuses that still need vendor action. */
export const OPEN_STATUSES: readonly FulfillmentStatus[] = ["new", "accepted", "packed"];

export function nextStatuses(from: FulfillmentStatus): readonly FulfillmentStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: FulfillmentStatus, to: FulfillmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export interface PackageDetails {
  readonly packageCount: number | null;
  readonly weightGrams: number | null;
  readonly lengthCm: number | null;
  readonly widthCm: number | null;
  readonly heightCm: number | null;
}

/** A shipment may be marked packed/shipped only once its package is fully described. */
export function validateShipReadiness(pkg: PackageDetails): boolean {
  return [pkg.packageCount, pkg.weightGrams, pkg.lengthCm, pkg.widthCm, pkg.heightCm].every(
    (v) => typeof v === "number" && Number.isFinite(v) && v > 0,
  );
}

/** Collapse per-vendor shipment statuses into the single status a customer sees. */
export function rollupOrderStatus(statuses: readonly FulfillmentStatus[]): OrderStatus {
  const live = statuses.filter((s) => s !== "cancelled");
  if (statuses.length > 0 && live.length === 0) return "cancelled";
  if (live.length === 0) return "processing";
  if (live.every((s) => s === "delivered")) return "delivered";
  const inTransit = live.filter((s) => s === "shipped" || s === "delivered").length;
  if (inTransit === live.length) return "shipped";
  if (inTransit > 0) return "partially_shipped";
  return "processing";
}
