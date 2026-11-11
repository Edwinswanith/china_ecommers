import "server-only";
import type { Document } from "mongodb";
import { byId, getDb } from "@/lib/db/client";
import { roundToWholeUnits } from "@/lib/domain/money";
import {
  dayKeyOf,
  fillDaily,
  percentChange,
  STORE_TIME_ZONE,
  stockRunwayDays,
  sumWindow,
  type DailyValue,
} from "@/lib/domain/analytics";

/** How much history the dashboards read. Enough for the monthly view. */
export const HISTORY_DAYS = 365;
const TOP_PRODUCT_DAYS = 30;
const TOP_PRODUCT_LIMIT = 5;
const RUNWAY_DAYS = 30;
const SPEED_DAYS = 90;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Optional scope: one vendor's figures, a set of vendors, one customer market, or the whole store when omitted. */
export interface AnalyticsScope {
  readonly vendorId?: string;
  /** Several vendors, e.g. every vendor in one country. */
  readonly vendorIds?: readonly string[] | null;
  /** Only orders placed from this market (the customer's country). */
  readonly market?: string | null;
}

function vendorCondition(scope: AnalyticsScope): Document {
  if (scope.vendorId) return { vendorId: scope.vendorId };
  return scope.vendorIds ? { vendorId: { $in: scope.vendorIds } } : {};
}

const dayKeyExpression = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: STORE_TIME_ZONE } };

/**
 * Shipments that count as sales: not cancelled, on an order that was paid.
 * Every figure on the dashboards starts from this, so they always agree.
 */
function soldShipments(scope: AnalyticsScope, since: Date): Document[] {
  return [
    { $match: { createdAt: { $gte: since }, status: { $ne: "cancelled" }, ...vendorCondition(scope) } },
    { $lookup: { from: "orders", localField: "orderId", foreignField: "_id", as: "order" } },
    { $match: { "order.paymentStatus": "paid", ...(scope.market ? { "order.marketCountry": scope.market } : {}) } },
  ];
}

export interface PeriodComparison {
  readonly current: number;
  readonly previous: number;
  /** Fractional change, or null when the earlier period had nothing to compare with. */
  readonly change: number | null;
}

const compare = (current: number, previous: number): PeriodComparison => ({ current, previous, change: percentChange(current, previous) });

export interface SalesHistory {
  /** The store-local day the series ends on. */
  readonly endDay: string;
  /** Sales in minor units for each of the last HISTORY_DAYS days, oldest first. */
  readonly dailySales: readonly number[];
  /** Orders (for the store) or shipments (for one vendor) per day, oldest first. */
  readonly dailyOrders: readonly number[];
  readonly sales30: PeriodComparison;
  readonly sales7: PeriodComparison;
  readonly orders30: PeriodComparison;
  readonly averageOrder30: PeriodComparison;
}

export async function getSalesHistory(scope: AnalyticsScope = {}, now: Date = new Date()): Promise<SalesHistory> {
  const db = await getDb();
  const endDay = dayKeyOf(now);
  // One extra day so the oldest store-local day is complete whatever the server's time zone.
  const since = new Date(now.getTime() - (HISTORY_DAYS + 1) * DAY_MS);

  const rows = await db.vendorOrders
    .aggregate<{ _id: string; salesMinor: number; orderIds: string[] }>([
      ...soldShipments(scope, since),
      { $group: { _id: dayKeyExpression, salesMinor: { $sum: "$subtotalMinor" }, orderIds: { $addToSet: "$orderId" } } },
    ])
    .toArray();

  const sales: DailyValue[] = rows.map((row) => ({ day: row._id, value: row.salesMinor }));
  const orders: DailyValue[] = rows.map((row) => ({ day: row._id, value: row.orderIds.length }));
  const dailySales = fillDaily(sales, endDay, HISTORY_DAYS);
  const dailyOrders = fillDaily(orders, endDay, HISTORY_DAYS);

  const sales30 = compare(sumWindow(dailySales, 30), sumWindow(dailySales, 30, 30));
  const orders30 = compare(sumWindow(dailyOrders, 30), sumWindow(dailyOrders, 30, 30));
  const average = (salesTotal: number, orderTotal: number): number => (orderTotal > 0 ? roundToWholeUnits(salesTotal / orderTotal) : 0);

  return {
    endDay,
    dailySales,
    dailyOrders,
    sales30,
    sales7: compare(sumWindow(dailySales, 7), sumWindow(dailySales, 7, 7)),
    orders30,
    averageOrder30: compare(average(sales30.current, orders30.current), average(sales30.previous, orders30.previous)),
  };
}

export interface VendorDailySales {
  readonly vendorId: string;
  readonly name: string;
  readonly dailySales: readonly number[];
  readonly total: number;
}

/** Daily sales per vendor over the last `days` days, highest total first. */
export async function getVendorSalesHistory(days: number, scope: AnalyticsScope = {}, now: Date = new Date()): Promise<VendorDailySales[]> {
  const db = await getDb();
  const endDay = dayKeyOf(now);
  const since = new Date(now.getTime() - (days + 1) * DAY_MS);
  const rows = await db.vendorOrders
    .aggregate<{ _id: { day: string; vendorId: string }; salesMinor: number }>([
      ...soldShipments(scope, since),
      { $group: { _id: { day: dayKeyExpression, vendorId: "$vendorId" }, salesMinor: { $sum: "$subtotalMinor" } } },
    ])
    .toArray();

  const byVendor = new Map<string, DailyValue[]>();
  for (const row of rows) {
    byVendor.set(row._id.vendorId, [...(byVendor.get(row._id.vendorId) ?? []), { day: row._id.day, value: row.salesMinor }]);
  }
  const vendors = await byId(db.vendors, [...byVendor.keys()]);
  return [...byVendor]
    .map(([vendorId, values]) => {
      const dailySales = fillDaily(values, endDay, days);
      return { vendorId, name: vendors.get(vendorId)?.name ?? "Vendor", dailySales, total: dailySales.reduce((a, b) => a + b, 0) };
    })
    .sort((a, b) => b.total - a.total);
}

export interface TopProduct {
  readonly productId: string;
  readonly name: string;
  readonly units: number;
  readonly salesMinor: number;
}

/** Best sellers by sales value over the last 30 days. */
export async function getTopProducts(scope: AnalyticsScope = {}, now: Date = new Date()): Promise<TopProduct[]> {
  const db = await getDb();
  const since = new Date(now.getTime() - TOP_PRODUCT_DAYS * DAY_MS);
  const rows = await db.vendorOrders
    .aggregate<{ _id: string; name: string; units: number; salesMinor: number }>([
      ...soldShipments(scope, since),
      { $lookup: { from: "order_items", localField: "_id", foreignField: "vendorOrderId", as: "item" } },
      { $unwind: "$item" },
      {
        $group: {
          _id: "$item.productId",
          name: { $last: "$item.name" },
          units: { $sum: "$item.quantity" },
          salesMinor: { $sum: { $multiply: ["$item.unitPriceMinor", "$item.quantity"] } },
        },
      },
      { $sort: { salesMinor: -1, _id: 1 } },
      { $limit: TOP_PRODUCT_LIMIT },
    ])
    .toArray();
  return rows.map((row) => ({ productId: row._id, name: row.name, units: row.units, salesMinor: row.salesMinor }));
}

export interface StockRunway {
  readonly productId: string;
  readonly name: string;
  readonly stock: number;
  readonly unitsSold: number;
  /** Estimated days until this product sells out at the recent rate. */
  readonly daysLeft: number;
}

/** A vendor's live products that will sell out soonest at their last-30-day selling rate. */
export async function getStockRunway(vendorId: string, limit = 5, now: Date = new Date()): Promise<StockRunway[]> {
  const db = await getDb();
  const since = new Date(now.getTime() - RUNWAY_DAYS * DAY_MS);
  const [products, sold] = await Promise.all([
    db.products.find({ vendorId, status: "active" }, { projection: { name: 1, stock: 1 } }).toArray(),
    db.vendorOrders
      .aggregate<{ _id: string; units: number }>([
        ...soldShipments({ vendorId }, since),
        { $lookup: { from: "order_items", localField: "_id", foreignField: "vendorOrderId", as: "item" } },
        { $unwind: "$item" },
        { $group: { _id: "$item.productId", units: { $sum: "$item.quantity" } } },
      ])
      .toArray(),
  ]);
  const unitsById = new Map(sold.map((row) => [row._id, row.units]));
  return products
    .flatMap((product): StockRunway[] => {
      const unitsSold = unitsById.get(product._id) ?? 0;
      const daysLeft = stockRunwayDays(product.stock, unitsSold, RUNWAY_DAYS);
      return daysLeft === null ? [] : [{ productId: product._id, name: product.name, stock: product.stock, unitsSold, daysLeft }];
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, limit);
}

export interface FulfilmentSpeed {
  readonly vendorId: string;
  readonly name: string;
  readonly shippedCount: number;
  /** Average hours from order to handing the parcel to the carrier. */
  readonly hoursToShip: number | null;
  /** Average days from order to delivery. */
  readonly daysToDeliver: number | null;
}

/** How quickly each vendor ships and delivers, slowest to ship first. Last 90 days. */
export async function getFulfilmentSpeed(scope: AnalyticsScope = {}, now: Date = new Date()): Promise<FulfilmentSpeed[]> {
  const db = await getDb();
  const since = new Date(now.getTime() - SPEED_DAYS * DAY_MS);
  const elapsed = (field: string) => ({ $cond: [{ $ne: [field, null] }, { $subtract: [field, "$createdAt"] }, null] });
  const rows = await db.vendorOrders
    .aggregate<{ _id: string; shippedCount: number; toShipMs: number | null; toDeliverMs: number | null }>([
      { $match: { createdAt: { $gte: since }, shippedAt: { $ne: null }, ...vendorCondition(scope) } },
      ...(scope.market
        ? [
            { $lookup: { from: "orders", localField: "orderId", foreignField: "_id", as: "order" } },
            { $match: { "order.marketCountry": scope.market } },
          ]
        : []),
      {
        $group: {
          _id: "$vendorId",
          shippedCount: { $sum: 1 },
          // $avg skips nulls, so undelivered shipments do not drag the delivery average down.
          toShipMs: { $avg: elapsed("$shippedAt") },
          toDeliverMs: { $avg: elapsed("$deliveredAt") },
        },
      },
    ])
    .toArray();
  const vendors = await byId(db.vendors, rows.map((row) => row._id));
  return rows
    .map((row) => ({
      vendorId: row._id,
      name: vendors.get(row._id)?.name ?? "Vendor",
      shippedCount: row.shippedCount,
      hoursToShip: row.toShipMs === null ? null : row.toShipMs / HOUR_MS,
      daysToDeliver: row.toDeliverMs === null ? null : row.toDeliverMs / DAY_MS,
    }))
    .sort((a, b) => (b.hoursToShip ?? 0) - (a.hoursToShip ?? 0));
}
