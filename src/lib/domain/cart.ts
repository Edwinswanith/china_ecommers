export interface CartLine {
  readonly productId: string;
  readonly quantity: number;
}

/** The server-side truth about a product at checkout time. */
export interface PricedProduct {
  readonly id: string;
  readonly vendorId: string;
  readonly name: string;
  readonly image: string | null;
  readonly priceMinor: number;
  readonly currency: string;
  readonly stock: number;
  /** Product is active and its vendor is active. */
  readonly purchasable: boolean;
}

export interface DraftItem {
  readonly productId: string;
  readonly name: string;
  readonly image: string | null;
  readonly unitPriceMinor: number;
  readonly quantity: number;
  readonly lineTotalMinor: number;
}

export interface DraftShipment {
  readonly vendorId: string;
  readonly items: readonly DraftItem[];
  readonly subtotalMinor: number;
}

export interface OrderDraft {
  readonly currency: string;
  readonly shipments: readonly DraftShipment[];
  readonly subtotalMinor: number;
  /** Placeholder until the logistics team supplies rates. */
  readonly shippingMinor: number;
  /** Placeholder until the customs team supplies duty calculation. */
  readonly dutiesMinor: number;
  readonly totalMinor: number;
}

export type OrderDraftResult =
  | { readonly ok: true; readonly draft: OrderDraft }
  | { readonly ok: false; readonly errors: readonly string[] };

export const MAX_QUANTITY_PER_LINE = 10;
/** ₹1 crore. Keeps every total well inside a 32-bit integer column. */
export const MAX_ORDER_TOTAL_MINOR = 1_000_000_000;

function mergeLines(lines: readonly CartLine[]): CartLine[] {
  const totals = new Map<string, number>();
  for (const line of lines) {
    totals.set(line.productId, (totals.get(line.productId) ?? 0) + line.quantity);
  }
  return [...totals].map(([productId, quantity]) => ({ productId, quantity }));
}

/**
 * Validate a cart against current catalogue data and split it into one
 * shipment per vendor. Prices always come from `catalog`, never the client.
 */
export function buildOrderDraft(lines: readonly CartLine[], catalog: readonly PricedProduct[]): OrderDraftResult {
  if (lines.length === 0) return { ok: false, errors: ["Your cart is empty."] };

  const byId = new Map(catalog.map((p) => [p.id, p]));
  const errors: string[] = [];
  const items: Array<DraftItem & { vendorId: string; currency: string }> = [];

  for (const line of mergeLines(lines)) {
    const product = byId.get(line.productId);
    if (!product || !product.purchasable) {
      errors.push(`${product?.name ?? "An item"} is no longer available.`);
      continue;
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY_PER_LINE) {
      errors.push(`Choose between 1 and ${MAX_QUANTITY_PER_LINE} of ${product.name}.`);
      continue;
    }
    if (product.stock < line.quantity) {
      errors.push(product.stock === 0 ? `${product.name} is out of stock.` : `Only ${product.stock} left of ${product.name}.`);
      continue;
    }
    items.push({
      vendorId: product.vendorId,
      currency: product.currency,
      productId: product.id,
      name: product.name,
      image: product.image,
      unitPriceMinor: product.priceMinor,
      quantity: line.quantity,
      lineTotalMinor: product.priceMinor * line.quantity,
    });
  }

  const currencies = new Set(items.map((i) => i.currency));
  if (currencies.size > 1) errors.push("Items priced in different currencies cannot be ordered together.");
  if (errors.length > 0) return { ok: false, errors };

  const vendorIds = [...new Set(items.map((i) => i.vendorId))];
  const shipments: DraftShipment[] = vendorIds.map((vendorId) => {
    const vendorItems = items
      .filter((i) => i.vendorId === vendorId)
      .map((i): DraftItem => ({
        productId: i.productId,
        name: i.name,
        image: i.image,
        unitPriceMinor: i.unitPriceMinor,
        quantity: i.quantity,
        lineTotalMinor: i.lineTotalMinor,
      }));
    return {
      vendorId,
      items: vendorItems,
      subtotalMinor: vendorItems.reduce((sum, i) => sum + i.lineTotalMinor, 0),
    };
  });

  const subtotalMinor = shipments.reduce((sum, s) => sum + s.subtotalMinor, 0);
  if (subtotalMinor > MAX_ORDER_TOTAL_MINOR) {
    return { ok: false, errors: ["This order is too large to place online. Please split it into smaller orders."] };
  }
  const shippingMinor = 0;
  const dutiesMinor = 0;
  return {
    ok: true,
    draft: {
      currency: items[0].currency,
      shipments,
      subtotalMinor,
      shippingMinor,
      dutiesMinor,
      totalMinor: subtotalMinor + shippingMinor + dutiesMinor,
    },
  };
}
