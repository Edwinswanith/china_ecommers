"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { DEFAULT_MARKET } from "@/lib/config/markets";
import { getProductsByIds, type ProductListing } from "@/lib/data/catalog";
import { getDb } from "@/lib/db/client";
import { insertOrder, OutOfStockError } from "@/lib/db/order-writer";
import { buildOrderDraft, type PricedProduct } from "@/lib/domain/cart";
import { charge } from "@/lib/payments";
import { addressSchema, cartLinesSchema } from "@/lib/validation/schemas";

export interface CartProduct {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly image: string | null;
  readonly priceMinor: number;
  readonly currency: string;
  readonly stock: number;
  readonly vendorName: string;
  readonly vendorCountry: string;
}

const toCartProduct = (p: ProductListing): CartProduct => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  image: p.images[0] ?? null,
  priceMinor: p.priceMinor,
  currency: p.currency,
  stock: p.stock,
  vendorName: p.vendor.name,
  vendorCountry: p.vendor.countryCode,
});

const toPriced = (p: ProductListing): PricedProduct => ({
  id: p.id,
  vendorId: p.vendorId,
  name: p.name,
  image: p.images[0] ?? null,
  priceMinor: p.priceMinor,
  currency: p.currency,
  stock: p.stock,
  purchasable: true,
});

/** Current price and stock for the products in a browser cart. */
export async function loadCartProducts(productIds: readonly string[]): Promise<CartProduct[]> {
  const ids = productIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 50);
  return (await getProductsByIds(ids)).map(toCartProduct);
}

export type PlaceOrderResult =
  | { readonly ok: true; readonly orderId: string }
  | { readonly ok: false; readonly errors: readonly string[]; readonly fieldErrors?: Readonly<Record<string, string>> };

export async function placeOrderAction(rawLines: unknown, rawAddress: unknown): Promise<PlaceOrderResult> {
  const session = await getSession();
  if (!session) return { ok: false, errors: ["Please sign in to place your order."] };
  if (session.role !== "customer") return { ok: false, errors: ["Vendor and admin accounts cannot place orders. Sign in with a customer account."] };

  const lines = cartLinesSchema.safeParse(rawLines);
  if (!lines.success) return { ok: false, errors: ["Your cart could not be read. Please refresh and try again."] };
  const address = addressSchema.safeParse(rawAddress);
  if (!address.success) {
    const fieldErrors = Object.fromEntries(address.error.issues.map((i) => [String(i.path[0]), i.message]));
    return { ok: false, errors: ["Please check your delivery address."], fieldErrors };
  }

  const catalog = (await getProductsByIds(lines.data.map((l) => l.productId))).map(toPriced);
  const result = buildOrderDraft(lines.data, catalog);
  if (!result.ok) return { ok: false, errors: result.errors };

  try {
    const payment = await charge({ amountMinor: result.draft.totalMinor, currency: result.draft.currency, customerId: session.userId });
    if (payment.status === "failed") return { ok: false, errors: ["Payment was declined. Please try another method."] };
    const order = await insertOrder(await getDb(), {
      customerId: session.userId,
      marketCountry: DEFAULT_MARKET.code,
      draft: result.draft,
      shippingAddress: { ...address.data, country: DEFAULT_MARKET.code },
      payment,
    });
    revalidatePath("/", "layout");
    return { ok: true, orderId: order.id };
  } catch (error: unknown) {
    if (error instanceof OutOfStockError) return { ok: false, errors: [error.message] };
    console.error("placeOrderAction failed", error);
    return { ok: false, errors: ["We could not place your order. Nothing was charged. Please try again."] };
  }
}
