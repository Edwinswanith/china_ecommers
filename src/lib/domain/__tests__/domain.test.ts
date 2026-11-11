import { describe, expect, it } from "vitest";
import { formatMoney, toMinor } from "../money";
import { buildOrderDraft, type CartLine, type PricedProduct } from "../cart";
import { canTransition, nextStatuses, rollupOrderStatus, validateShipReadiness } from "../fulfillment";
import { findReviewablePurchase, ratingAverage, type PurchaseRecord } from "../reviews";

const product = (over: Partial<PricedProduct> = {}): PricedProduct => ({
  id: "p1",
  vendorId: "v1",
  name: "Lamp",
  image: null,
  priceMinor: 100_00,
  currency: "INR",
  stock: 5,
  purchasable: true,
  ...over,
});

describe("money", () => {
  it("formats INR from minor units", () => {
    expect(formatMoney(249900, "INR")).toBe("₹2,499");
    expect(formatMoney(249950, "INR")).toBe("₹2,499.50");
  });
  it("converts a decimal string to minor units without float drift", () => {
    expect(toMinor("2499")).toBe(249900);
    expect(toMinor("19.99")).toBe(1999);
    expect(toMinor("0.1")).toBe(10);
  });
  it("rejects invalid amounts", () => {
    expect(() => toMinor("abc")).toThrow();
    expect(() => toMinor("-5")).toThrow();
    expect(() => toMinor("1.999")).toThrow();
  });
});

describe("buildOrderDraft", () => {
  const catalog = [
    product({ id: "p1", vendorId: "v1", priceMinor: 100_00 }),
    product({ id: "p2", vendorId: "v2", priceMinor: 250_00 }),
    product({ id: "p3", vendorId: "v1", priceMinor: 50_00 }),
  ];

  it("splits a cart into one shipment per vendor", () => {
    const lines: CartLine[] = [
      { productId: "p1", quantity: 2 },
      { productId: "p2", quantity: 1 },
      { productId: "p3", quantity: 1 },
    ];
    const result = buildOrderDraft(lines, catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.shipments).toHaveLength(2);
    const v1 = result.draft.shipments.find((s) => s.vendorId === "v1");
    expect(v1?.items).toHaveLength(2);
    expect(v1?.subtotalMinor).toBe(250_00);
    expect(result.draft.subtotalMinor).toBe(500_00);
    expect(result.draft.totalMinor).toBe(500_00);
  });

  it("merges duplicate lines for the same product", () => {
    const result = buildOrderDraft(
      [
        { productId: "p1", quantity: 1 },
        { productId: "p1", quantity: 2 },
      ],
      catalog,
    );
    expect(result.ok && result.draft.shipments[0].items[0].quantity).toBe(3);
  });

  it("rejects an empty cart", () => {
    expect(buildOrderDraft([], catalog)).toMatchObject({ ok: false });
  });

  it("rejects unknown, unavailable and out-of-stock products", () => {
    expect(buildOrderDraft([{ productId: "nope", quantity: 1 }], catalog).ok).toBe(false);
    const off = [product({ purchasable: false })];
    expect(buildOrderDraft([{ productId: "p1", quantity: 1 }], off).ok).toBe(false);
    const low = [product({ stock: 1 })];
    const result = buildOrderDraft([{ productId: "p1", quantity: 2 }], low);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain("Only 1 left");
  });

  it("rejects carts mixing currencies", () => {
    const mixed = [product(), product({ id: "p2", currency: "USD" })];
    const result = buildOrderDraft(
      [
        { productId: "p1", quantity: 1 },
        { productId: "p2", quantity: 1 },
      ],
      mixed,
    );
    expect(result.ok).toBe(false);
  });

  it("does not mutate its inputs", () => {
    const lines: CartLine[] = [{ productId: "p1", quantity: 1 }];
    const snapshot = JSON.stringify(lines);
    buildOrderDraft(lines, catalog);
    expect(JSON.stringify(lines)).toBe(snapshot);
  });
});

describe("fulfillment", () => {
  it("allows only forward transitions", () => {
    expect(canTransition("new", "accepted")).toBe(true);
    expect(canTransition("accepted", "packed")).toBe(true);
    expect(canTransition("packed", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
    expect(canTransition("new", "shipped")).toBe(false);
    expect(canTransition("delivered", "shipped")).toBe(false);
    expect(canTransition("shipped", "cancelled")).toBe(false);
    expect(canTransition("new", "cancelled")).toBe(true);
    expect(nextStatuses("delivered")).toEqual([]);
  });

  it("requires package details before packing", () => {
    expect(validateShipReadiness({ packageCount: null, weightGrams: null, lengthCm: null, widthCm: null, heightCm: null })).toBe(false);
    expect(validateShipReadiness({ packageCount: 1, weightGrams: 400, lengthCm: 20, widthCm: 10, heightCm: 8 })).toBe(true);
    expect(validateShipReadiness({ packageCount: 0, weightGrams: 400, lengthCm: 20, widthCm: 10, heightCm: 8 })).toBe(false);
  });

  it("rolls shipment statuses up to an order status", () => {
    expect(rollupOrderStatus(["new", "accepted"])).toBe("processing");
    expect(rollupOrderStatus(["shipped", "new"])).toBe("partially_shipped");
    expect(rollupOrderStatus(["shipped", "delivered"])).toBe("shipped");
    expect(rollupOrderStatus(["delivered", "delivered"])).toBe("delivered");
    expect(rollupOrderStatus(["delivered", "cancelled"])).toBe("delivered");
    expect(rollupOrderStatus(["cancelled"])).toBe("cancelled");
    expect(rollupOrderStatus([])).toBe("processing");
  });
});

describe("reviews", () => {
  const purchases: PurchaseRecord[] = [
    { orderItemId: "i1", productId: "p1", fulfillmentStatus: "shipped", paid: true },
    { orderItemId: "i2", productId: "p1", fulfillmentStatus: "delivered", paid: true },
    { orderItemId: "i3", productId: "p2", fulfillmentStatus: "delivered", paid: false },
  ];

  it("allows a review only for a paid, delivered purchase", () => {
    expect(findReviewablePurchase("p1", purchases, false)).toEqual({ ok: true, orderItemId: "i2" });
    expect(findReviewablePurchase("p2", purchases, false)).toMatchObject({ ok: false, reason: "not_delivered" });
    expect(findReviewablePurchase("p9", purchases, false)).toMatchObject({ ok: false, reason: "not_purchased" });
  });

  it("blocks a second review of the same product", () => {
    expect(findReviewablePurchase("p1", purchases, true)).toMatchObject({ ok: false, reason: "already_reviewed" });
  });

  it("computes a one-decimal average", () => {
    expect(ratingAverage(0, 0)).toBeNull();
    expect(ratingAverage(13, 3)).toBe(4.3);
  });
});

import { parseFaqs, parseHighlights, parseSpecs } from "@/lib/validation/product-text";
import { safeImageName } from "@/lib/storage-names";

describe("product text parsing", () => {
  it("parses one entry per line and ignores malformed lines", () => {
    expect(parseHighlights("  One \n\nTwo\n")).toEqual(["One", "Two"]);
    expect(parseSpecs("Weight: 120 g\nno colon here\nSize: 10 × 20 mm")).toEqual([
      { label: "Weight", value: "120 g" },
      { label: "Size", value: "10 × 20 mm" },
    ]);
    expect(parseFaqs("Is it loud? | No.\nbroken line")).toEqual([{ q: "Is it loud?", a: "No." }]);
  });
});

describe("safeImageName", () => {
  it("accepts generated names and rejects traversal", () => {
    expect(safeImageName("3f2b8c1e-7a4d-4e1b-9c0a-1234567890ab.webp")).toBe(true);
    expect(safeImageName("../../etc/passwd")).toBe(false);
    expect(safeImageName("x.svg")).toBe(false);
  });
});

import { safeNextPath } from "@/lib/auth/paths";
import { MAX_ORDER_TOTAL_MINOR } from "../cart";

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/checkout")).toBe("/checkout");
    expect(safeNextPath("/products/x#reviews")).toBe("/products/x#reviews");
  });
  it("rejects off-site and malformed targets", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/\t/evil.com", "/\\evil.com", "/\n/evil.com", "", null]) {
      expect(safeNextPath(bad, "/")).toBe("/");
    }
  });
});

describe("order size cap", () => {
  it("rejects orders above the maximum total", () => {
    const pricey = [product({ priceMinor: MAX_ORDER_TOTAL_MINOR / 5, stock: 10 })];
    expect(buildOrderDraft([{ productId: "p1", quantity: 5 }], pricey).ok).toBe(true);
    expect(buildOrderDraft([{ productId: "p1", quantity: 6 }], pricey).ok).toBe(false);
  });
});
