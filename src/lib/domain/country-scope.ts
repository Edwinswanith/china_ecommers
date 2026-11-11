/**
 * The admin panel's country filter. Two independent sides:
 * where the vendor ships from, and where the customer buys from.
 * Null on a side means "all countries".
 */
export interface CountryScope {
  readonly vendorCountry: string | null;
  readonly customerCountry: string | null;
}

export const ALL_COUNTRIES: CountryScope = { vendorCountry: null, customerCountry: null };

/** A country code if it is one of the allowed ones, otherwise null (no filter). */
export function parseCountry(value: unknown, allowed: readonly string[]): string | null {
  return typeof value === "string" && allowed.includes(value) ? value : null;
}

export function isScoped(scope: CountryScope): boolean {
  return scope.vendorCountry !== null || scope.customerCountry !== null;
}

/** One line describing what the figures on a page cover. */
export function scopeLabel(scope: CountryScope, nameOf: (code: string) => string): string {
  const vendors = scope.vendorCountry ? `Vendors in ${nameOf(scope.vendorCountry)}` : "All vendor countries";
  const customers = scope.customerCountry ? `Customers in ${nameOf(scope.customerCountry)}` : "All customer countries";
  return `${vendors} · ${customers}`;
}

interface ShipmentPart {
  readonly vendorId: string;
  readonly subtotalMinor: number;
}

export interface ScopedOrder<T extends ShipmentPart> {
  /** The shipments that belong to the selected vendors. */
  readonly shipments: readonly T[];
  /** The value of those shipments: the whole order when nothing was left out. */
  readonly totalMinor: number;
  /** True when the order also has shipments from vendors outside the filter. */
  readonly partial: boolean;
}

/**
 * One order can hold shipments from vendors in different countries. With a
 * vendor filter on, only the selected vendors' part counts, so the figures
 * for each country add up to the figure for all countries.
 */
export function scopeOrderShipments<T extends ShipmentPart>(shipments: readonly T[], vendorIds: ReadonlySet<string> | null, orderTotalMinor: number): ScopedOrder<T> {
  if (!vendorIds) return { shipments, totalMinor: orderTotalMinor, partial: false };
  const kept = shipments.filter((shipment) => vendorIds.has(shipment.vendorId));
  const partial = kept.length < shipments.length;
  return {
    shipments: kept,
    totalMinor: partial ? kept.reduce((sum, shipment) => sum + shipment.subtotalMinor, 0) : orderTotalMinor,
    partial,
  };
}
