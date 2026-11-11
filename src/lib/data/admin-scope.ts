import "server-only";
import type { Document } from "mongodb";
import { cookies } from "next/headers";
import { cache } from "react";
import { countryName, MARKETS, VENDOR_COUNTRIES } from "@/lib/config/markets";
import { getDb } from "@/lib/db/client";
import { parseCountry, scopeLabel, type CountryScope } from "@/lib/domain/country-scope";

/** The admin's country choice is remembered in cookies so it follows them from page to page. */
export const VENDOR_COUNTRY_COOKIE = "curio_admin_vendor_country";
export const CUSTOMER_COUNTRY_COOKIE = "curio_admin_customer_country";

const KNOWN_COUNTRIES: readonly string[] = Object.keys(VENDOR_COUNTRIES);

/** The country filter as database conditions. */
export interface ResolvedScope {
  /** Vendors in the selected country, or null for every vendor. */
  readonly vendorIds: readonly string[] | null;
  /** The customers' country (the order's market), or null for every market. */
  readonly market: string | null;
}

export const UNSCOPED: ResolvedScope = { vendorIds: null, market: null };

export interface AdminScope {
  readonly scope: CountryScope;
  readonly resolved: ResolvedScope;
  /** e.g. "Vendors in China · All customer countries" */
  readonly label: string;
}

/** The country filter the signed-in admin has chosen. Cached per request. */
export const getAdminScope = cache(async (): Promise<AdminScope> => {
  const store = await cookies();
  const scope: CountryScope = {
    vendorCountry: parseCountry(store.get(VENDOR_COUNTRY_COOKIE)?.value, KNOWN_COUNTRIES),
    customerCountry: parseCountry(store.get(CUSTOMER_COUNTRY_COOKIE)?.value, KNOWN_COUNTRIES),
  };
  return { scope, resolved: await resolveScope(scope), label: scopeLabel(scope, countryName) };
});

async function resolveScope(scope: CountryScope): Promise<ResolvedScope> {
  if (!scope.vendorCountry) return { vendorIds: null, market: scope.customerCountry };
  const db = await getDb();
  const vendors = await db.vendors.find({ countryCode: scope.vendorCountry }, { projection: { _id: 1 } }).toArray();
  return { vendorIds: vendors.map((vendor) => vendor._id), market: scope.customerCountry };
}

export interface CountryOption {
  readonly code: string;
  readonly name: string;
}

export interface ScopeOptions {
  readonly vendorCountries: readonly CountryOption[];
  readonly customerCountries: readonly CountryOption[];
}

const toOptions = (codes: readonly string[]): CountryOption[] =>
  [...new Set(codes)].map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name));

/** Countries worth offering: ones that have a vendor, and ones the store sells to or has sold to. */
export async function listScopeOptions(): Promise<ScopeOptions> {
  const db = await getDb();
  const [vendorCodes, orderMarkets] = await Promise.all([db.vendors.distinct("countryCode"), db.orders.distinct("marketCountry")]);
  return {
    vendorCountries: toOptions(vendorCodes),
    customerCountries: toOptions([...MARKETS.filter((market) => market.enabled).map((market) => market.code), ...orderMarkets]),
  };
}

/** Condition for collections that carry a `vendorId` (shipments, products). */
export function vendorMatch(scope: ResolvedScope): Document {
  return scope.vendorIds ? { vendorId: { $in: scope.vendorIds } } : {};
}

/** Pipeline stages that keep only shipments on orders from the selected market. Nothing when no market is selected. */
export function marketStages(scope: ResolvedScope): Document[] {
  if (!scope.market) return [];
  return [
    { $lookup: { from: "orders", localField: "orderId", foreignField: "_id", as: "scopeOrder" } },
    { $match: { "scopeOrder.marketCountry": scope.market } },
  ];
}
