import { describe, expect, it } from "vitest";
import { ALL_COUNTRIES, isScoped, parseCountry, scopeLabel, scopeOrderShipments } from "../country-scope";

const nameOf = (code: string): string => ({ CN: "China", KR: "South Korea", IN: "India" })[code] ?? code;

describe("parseCountry", () => {
  it("accepts a known country code", () => {
    expect(parseCountry("CN", ["CN", "KR"])).toBe("CN");
  });

  it("treats anything else as no filter", () => {
    expect(parseCountry("", ["CN"])).toBeNull();
    expect(parseCountry("XX", ["CN"])).toBeNull();
    expect(parseCountry(undefined, ["CN"])).toBeNull();
    expect(parseCountry(42, ["CN"])).toBeNull();
  });
});

describe("isScoped", () => {
  it("is false only when both filters are off", () => {
    expect(isScoped(ALL_COUNTRIES)).toBe(false);
    expect(isScoped({ vendorCountry: "CN", customerCountry: null })).toBe(true);
    expect(isScoped({ vendorCountry: null, customerCountry: "IN" })).toBe(true);
  });
});

describe("scopeLabel", () => {
  it("names each selected country and says when a side is unfiltered", () => {
    expect(scopeLabel(ALL_COUNTRIES, nameOf)).toBe("All vendor countries · All customer countries");
    expect(scopeLabel({ vendorCountry: "CN", customerCountry: null }, nameOf)).toBe("Vendors in China · All customer countries");
    expect(scopeLabel({ vendorCountry: "KR", customerCountry: "IN" }, nameOf)).toBe("Vendors in South Korea · Customers in India");
  });
});

describe("scopeOrderShipments", () => {
  const shipments = [
    { id: "s1", vendorId: "china-1", subtotalMinor: 700 },
    { id: "s2", vendorId: "korea-1", subtotalMinor: 300 },
  ];

  it("keeps the whole order when no vendor filter is on", () => {
    const result = scopeOrderShipments(shipments, null, 1000);
    expect(result.shipments).toHaveLength(2);
    expect(result.totalMinor).toBe(1000);
    expect(result.partial).toBe(false);
  });

  it("keeps only the selected vendors' part of a mixed order", () => {
    const result = scopeOrderShipments(shipments, new Set(["china-1"]), 1000);
    expect(result.shipments.map((s) => s.id)).toEqual(["s1"]);
    expect(result.totalMinor).toBe(700);
    expect(result.partial).toBe(true);
  });

  it("parts of a mixed order add up to the whole order", () => {
    const china = scopeOrderShipments(shipments, new Set(["china-1"]), 1000);
    const korea = scopeOrderShipments(shipments, new Set(["korea-1"]), 1000);
    expect(china.totalMinor + korea.totalMinor).toBe(1000);
  });

  it("is not partial when every shipment is in the selected country", () => {
    const result = scopeOrderShipments(shipments, new Set(["china-1", "korea-1"]), 1000);
    expect(result.totalMinor).toBe(1000);
    expect(result.partial).toBe(false);
  });
});
