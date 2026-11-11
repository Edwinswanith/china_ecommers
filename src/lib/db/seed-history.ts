import { buildOrderDraft, type CartLine, type PricedProduct } from "@/lib/domain/cart";
import type { FulfillmentStatus } from "@/lib/domain/fulfillment";
import { newId, type Doc } from "./client";
import type { FulfillmentEvent, Order, OrderItem, Product, ShippingAddress, VendorOrder } from "./schema";

/**
 * Background order history for the demo: about three months of invented orders
 * with a gentle upward trend and busier weekends, so the dashboards have
 * something to chart and forecast. Generated from a fixed seed, so every
 * reset produces the same pattern relative to "today".
 */

const HISTORY_DAYS = 90;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const IST_OFFSET_MS = 5.5 * HOUR_MS;
const RANDOM_SEED = 20261111;
const ORDERS_PER_DAY_AT_START = 2;
const ORDERS_PER_DAY_NOW = 5;
const WEEKEND_BOOST = 1.35;
const SHOP_OPENS_HOUR = 8;
const SHOP_HOURS = 14.5;
const NUMBER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const FIRST_NAMES = ["Anitha", "Bharath", "Deepa", "Ganesh", "Harini", "Karthika", "Lokesh", "Madhavan", "Nithya", "Pradeep", "Revathi", "Sanjay", "Swathi", "Tharun", "Uma", "Vasanth", "Yamini", "Ashwin", "Kavya", "Ramesh"] as const;
const LAST_NAMES = ["Iyer", "Natarajan", "Balaji", "Chandran", "Devi", "Elango", "Ganesan", "Krishnan", "Murugan", "Rajan"] as const;
const AREAS: ReadonlyArray<readonly [area: string, pin: string, street: string]> = [
  ["Besant Nagar", "600090", "4th Main Road"],
  ["Mylapore", "600004", "Kutchery Road"],
  ["Nungambakkam", "600034", "Sterling Road"],
  ["Kodambakkam", "600024", "Arcot Road"],
  ["Tambaram", "600045", "Velachery Main Road"],
  ["Porur", "600116", "Mount Poonamallee Road"],
  ["Perambur", "600011", "Paper Mills Road"],
  ["Thiruvanmiyur", "600041", "East Coast Road"],
  ["Ashok Nagar", "600083", "11th Avenue"],
  ["Chromepet", "600044", "GST Road"],
];

/** How quickly each demo vendor works, in days from the order. Gives the speed table something to compare. */
const VENDOR_PACE: Readonly<Record<string, { readonly ship: number; readonly deliver: number }>> = {
  brightworks: { ship: 1.4, deliver: 8 },
  looplabs: { ship: 2.3, deliver: 10 },
  kinetic: { ship: 3.2, deliver: 11.5 },
};
const DEFAULT_PACE = { ship: 2, deliver: 10 } as const;

export interface HistoryCustomer {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly address: ShippingAddress;
}

export interface OrderHistory {
  readonly orders: Doc<Order>[];
  readonly vendorOrders: Doc<VendorOrder>[];
  readonly orderItems: Doc<OrderItem>[];
  readonly fulfillmentEvents: Doc<FulfillmentEvent>[];
}

/** Small repeatable random number generator (mulberry32). Returns values in [0, 1). */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Invented shoppers spread across Chennai, to place the background orders. */
export function buildHistoryCustomers(count: number): HistoryCustomer[] {
  return Array.from({ length: count }, (_, index) => {
    const name = `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[(index * 3) % LAST_NAMES.length]}`;
    const [area, pin, street] = AREAS[index % AREAS.length];
    return {
      id: newId(),
      name,
      email: `shopper${String(index + 1).padStart(2, "0")}@curio.example`,
      address: {
        fullName: name,
        phone: `98${String(40100000 + index * 7919).slice(0, 8)}`,
        line1: `${12 + index * 3}, ${street}`,
        line2: area,
        city: "Chennai",
        state: "Tamil Nadu",
        postalCode: pin,
        country: "IN",
      },
    };
  });
}

interface BuildHistoryInput {
  readonly now: Date;
  readonly products: readonly Product[];
  /** Vendor id to demo vendor key, for the per-vendor pace. */
  readonly vendorKeyById: ReadonlyMap<string, string>;
  readonly customers: readonly HistoryCustomer[];
}

export function buildOrderHistory({ now, products, vendorKeyById, customers }: BuildHistoryInput): OrderHistory {
  const random = createRandom(RANDOM_SEED);
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
  const between = (low: number, high: number): number => low + random() * (high - low);

  /** Number of orders on a day: the average, give or take one. Kept steady so the demo trend is easy to read. */
  const ordersFor = (average: number): number => Math.max(0, Math.round(average + between(-1, 1)));

  // Cheaper products sell more often.
  const weights = products.map((p) => 1 / Math.sqrt(p.priceMinor));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const pickProduct = (): Product => {
    let target = random() * totalWeight;
    for (const [index, weight] of weights.entries()) {
      target -= weight;
      if (target <= 0) return products[index];
    }
    return products[products.length - 1];
  };

  const catalog: PricedProduct[] = products.map((p) => ({
    id: p.id, vendorId: p.vendorId, name: p.name, image: p.images[0] ?? null,
    priceMinor: p.priceMinor, currency: p.currency, stock: Number.MAX_SAFE_INTEGER, purchasable: true,
  }));
  const weightById = new Map(products.map((p) => [p.id, p.weightGrams]));
  const usedNumbers = new Set<string>();
  const orderNumber = (): string => {
    for (;;) {
      const number = `CS-${Array.from({ length: 8 }, () => pick([...NUMBER_ALPHABET])).join("")}`;
      if (!usedNumbers.has(number)) {
        usedNumbers.add(number);
        return number;
      }
    }
  };

  const history: OrderHistory = { orders: [], vendorOrders: [], orderItems: [], fulfillmentEvents: [] };
  // Midnight today in India, as an instant.
  const todayStart = Math.floor((now.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;

  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const dayStart = todayStart - daysAgo * DAY_MS;
    const weekday = new Date(dayStart + IST_OFFSET_MS).getUTCDay();
    const growth = (HISTORY_DAYS - 1 - daysAgo) / (HISTORY_DAYS - 1);
    const average = (ORDERS_PER_DAY_AT_START + (ORDERS_PER_DAY_NOW - ORDERS_PER_DAY_AT_START) * growth) * (weekday === 0 || weekday === 6 ? WEEKEND_BOOST : 1);

    for (let n = ordersFor(average); n > 0; n -= 1) {
      const scheduled = dayStart + (SHOP_OPENS_HOUR + random() * SHOP_HOURS) * HOUR_MS;
      // Nothing can be ordered in the future: later slots today fall back to the last couple of hours.
      const placedAt = new Date(scheduled <= now.getTime() ? scheduled : now.getTime() - between(0.1, 2) * HOUR_MS);
      const ageDays = (now.getTime() - placedAt.getTime()) / DAY_MS;

      const lineCount = random() < 0.6 ? 1 : random() < 0.75 ? 2 : 3;
      const chosen = new Map<string, number>();
      while (chosen.size < lineCount) chosen.set(pickProduct().id, random() < 0.8 ? 1 : 2);
      const lines: CartLine[] = [...chosen].map(([productId, quantity]) => ({ productId, quantity }));
      const result = buildOrderDraft(lines, catalog);
      if (!result.ok) throw new Error(`Generated order is invalid: ${result.errors.join(" ")}`);
      const { draft } = result;

      const customer = pick(customers);
      const orderId = newId();
      history.orders.push({
        _id: orderId,
        number: orderNumber(),
        customerId: customer.id,
        marketCountry: "IN",
        currency: draft.currency,
        subtotalMinor: draft.subtotalMinor,
        shippingMinor: draft.shippingMinor,
        dutiesMinor: draft.dutiesMinor,
        totalMinor: draft.totalMinor,
        paymentStatus: "paid",
        paymentProvider: "placeholder",
        paymentRef: `history-${history.orders.length + 1}`,
        shippingAddress: customer.address,
        createdAt: placedAt,
      });

      for (const shipment of draft.shipments) {
        const pace = VENDOR_PACE[vendorKeyById.get(shipment.vendorId) ?? ""] ?? DEFAULT_PACE;
        const jitter = between(0.75, 1.3);
        const steps: ReadonlyArray<readonly [FulfillmentStatus, number]> = [
          ["new", 0],
          ["accepted", between(0.15, 0.45)],
          ["packed", pace.ship * jitter * 0.65],
          ["shipped", pace.ship * jitter],
          ["delivered", pace.deliver * jitter],
        ];
        const reached = steps.filter(([, afterDays]) => afterDays <= ageDays);
        const [status, statusAfterDays] = reached[reached.length - 1];
        const at = (afterDays: number): Date => new Date(placedAt.getTime() + afterDays * DAY_MS);
        const has = (target: FulfillmentStatus): boolean => reached.some(([step]) => step === target);
        const after = (target: FulfillmentStatus): number => steps.find(([step]) => step === target)![1];
        const packedWeight = shipment.items.reduce((total, item) => total + item.quantity * (weightById.get(item.productId) ?? 300), 0) + 180;
        const vendorOrderId = newId();

        history.vendorOrders.push({
          _id: vendorOrderId,
          orderId,
          vendorId: shipment.vendorId,
          status,
          subtotalMinor: shipment.subtotalMinor,
          packageCount: has("packed") ? 1 : null,
          weightGrams: has("packed") ? packedWeight : null,
          lengthCm: has("packed") ? (packedWeight <= 600 ? 20 : packedWeight <= 1200 ? 28 : 36) : null,
          widthCm: has("packed") ? (packedWeight <= 600 ? 15 : packedWeight <= 1200 ? 20 : 26) : null,
          heightCm: has("packed") ? (packedWeight <= 600 ? 10 : packedWeight <= 1200 ? 14 : 18) : null,
          carrier: has("shipped") ? "Placeholder Express" : null,
          trackingNumber: has("shipped") ? `PX${vendorOrderId.slice(0, 8).toUpperCase()}` : null,
          vendorNote: null,
          createdAt: placedAt,
          updatedAt: at(statusAfterDays),
          shippedAt: has("shipped") ? at(after("shipped")) : null,
          deliveredAt: has("delivered") ? at(after("delivered")) : null,
        });
        for (const [step, afterDays] of reached) {
          history.fulfillmentEvents.push({ _id: newId(), vendorOrderId, status: step, note: step === "new" ? "Order placed" : null, createdAt: at(afterDays) });
        }
        for (const item of shipment.items) {
          history.orderItems.push({
            _id: newId(),
            orderId,
            vendorOrderId,
            productId: item.productId,
            name: item.name,
            image: item.image,
            unitPriceMinor: item.unitPriceMinor,
            quantity: item.quantity,
          });
        }
      }
    }
  }
  return history;
}
