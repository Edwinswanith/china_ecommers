"use client";

import { useEffect, useMemo, useState } from "react";
import { loadCartProducts, type CartProduct } from "@/lib/actions/checkout";
import type { CartLine } from "@/lib/domain/cart";
import { useCart } from "./cart-store";

export interface CartRow {
  readonly line: CartLine;
  readonly product: CartProduct;
}

export interface CartData {
  readonly loading: boolean;
  readonly rows: readonly CartRow[];
  /** Lines whose product is no longer sold. */
  readonly unavailable: readonly CartLine[];
  readonly subtotalMinor: number;
  readonly currency: string;
  readonly lineCount: number;
}

/** Joins the browser cart with live price and stock from the server. */
export function useCartProducts(): CartData {
  const lines = useCart();
  const idsKey = useMemo(() => lines.map((l) => l.productId).sort().join(","), [lines]);
  const [loaded, setLoaded] = useState<{ key: string; products: readonly CartProduct[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ids = idsKey ? idsKey.split(",") : [];
    const request = ids.length > 0 ? loadCartProducts(ids) : Promise.resolve([]);
    request
      .then((products) => {
        if (!cancelled) setLoaded({ key: idsKey, products });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key: idsKey, products: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return useMemo(() => {
    const loading = loaded === null || loaded.key !== idsKey;
    const byId = new Map((loaded?.products ?? []).map((p) => [p.id, p]));
    const rows = lines.flatMap((line) => {
      const product = byId.get(line.productId);
      return product ? [{ line, product }] : [];
    });
    return {
      loading,
      rows,
      unavailable: loading ? [] : lines.filter((l) => !byId.has(l.productId)),
      subtotalMinor: rows.reduce((sum, r) => sum + r.product.priceMinor * r.line.quantity, 0),
      currency: rows[0]?.product.currency ?? "INR",
      lineCount: lines.length,
    };
  }, [lines, loaded, idsKey]);
}
