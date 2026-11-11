"use client";

import { useSyncExternalStore } from "react";
import { MAX_QUANTITY_PER_LINE, type CartLine } from "@/lib/domain/cart";

/**
 * The cart lives in the browser (localStorage) so anyone can shop without an
 * account. It holds only product ids and quantities; prices and stock are
 * always re-read from the server at cart and checkout time.
 */
const STORAGE_KEY = "curio.cart.v1";
const EMPTY: readonly CartLine[] = [];
const listeners = new Set<() => void>();
let snapshot: readonly CartLine[] | null = null;

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return typeof line.productId === "string" && Number.isInteger(line.quantity) && (line.quantity as number) > 0;
}

function readStorage(): readonly CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isCartLine) : EMPTY;
  } catch {
    // Storage blocked or corrupted: behave as an empty cart.
    return EMPTY;
  }
}

function getSnapshot(): readonly CartLine[] {
  if (snapshot === null) snapshot = readStorage();
  return snapshot;
}

function commit(next: readonly CartLine[]): void {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Cart still works for this tab even if it cannot be persisted.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== STORAGE_KEY) return;
    snapshot = readStorage();
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const clamp = (quantity: number): number => Math.max(1, Math.min(MAX_QUANTITY_PER_LINE, Math.trunc(quantity)));

export const cart = {
  add(productId: string, quantity = 1): void {
    const lines = getSnapshot();
    const existing = lines.find((l) => l.productId === productId);
    commit(
      existing
        ? lines.map((l) => (l.productId === productId ? { ...l, quantity: clamp(l.quantity + quantity) } : l))
        : [...lines, { productId, quantity: clamp(quantity) }],
    );
  },
  setQuantity(productId: string, quantity: number): void {
    commit(getSnapshot().map((l) => (l.productId === productId ? { ...l, quantity: clamp(quantity) } : l)));
  },
  remove(productId: string): void {
    commit(getSnapshot().filter((l) => l.productId !== productId));
  },
  clear(): void {
    commit(EMPTY);
  },
};

export function useCart(): readonly CartLine[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
