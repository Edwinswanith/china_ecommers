import bcrypt from "bcryptjs";
import { buildOrderDraft, type CartLine, type PricedProduct } from "@/lib/domain/cart";
import type { FulfillmentStatus } from "@/lib/domain/fulfillment";
import { newId, type Db } from "./client";
import { insertOrder } from "./order-writer";
import type { Product, ShippingAddress } from "./schema";
import { SEED_ADMIN, SEED_CATEGORIES, SEED_CUSTOMERS, SEED_PRODUCTS, SEED_VENDORS } from "./seed-data";

const FLOW: readonly FulfillmentStatus[] = ["new", "accepted", "packed", "shipped", "delivered"];

const DAY_MS = 86_400_000;
const daysAgo = (days: number): Date => new Date(Date.now() - days * DAY_MS);

/** Demo delivery addresses, all in Chennai. People, phone numbers and streets are made up. */
const ADDRESSES: Record<string, ShippingAddress> = {
  "customer@curio.example": { fullName: "Karthik Raman", phone: "9840012345", line1: "Flat 3B, Shanthi Apartments, 27 4th Avenue", line2: "Anna Nagar", city: "Chennai", state: "Tamil Nadu", postalCode: "600040", country: "IN" },
  "divya@curio.example": { fullName: "Divya Subramanian", phone: "9884012345", line1: "12 Gandhi Nagar 2nd Main Road", line2: "Adyar", city: "Chennai", state: "Tamil Nadu", postalCode: "600020", country: "IN" },
  "arun@curio.example": { fullName: "Arun Prakash", phone: "9790012345", line1: "45 Bazullah Road", line2: "T. Nagar", city: "Chennai", state: "Tamil Nadu", postalCode: "600017", country: "IN" },
  "meena@curio.example": { fullName: "Meena Lakshmi", phone: "9962012345", line1: "Plot 18, Vijaya Nagar 3rd Cross Street", line2: "Velachery", city: "Chennai", state: "Tamil Nadu", postalCode: "600042", country: "IN" },
  "vignesh@curio.example": { fullName: "Vignesh Kumar", phone: "9500012345", line1: "Tower 2, Flat 904, Lakeview Residences, Rajiv Gandhi Salai", line2: "Sholinganallur", city: "Chennai", state: "Tamil Nadu", postalCode: "600119", country: "IN" },
};

interface SeedOrder {
  customer: string;
  /** How long ago the order was placed. */
  placedDaysAgo: number;
  lines: Array<[slug: string, quantity: number]>;
  /** Target status per vendor key; vendors not listed stay "new". */
  progress: Record<string, FulfillmentStatus>;
}

/** One order at every stage, so each screen in the walkthrough has something to show. */
const SEED_ORDERS: SeedOrder[] = [
  { customer: "divya@curio.example", placedDaysAgo: 21, lines: [["floating-lamp", 1], ["glow-speaker-lamp", 1]], progress: { brightworks: "delivered", kinetic: "delivered" } },
  { customer: "arun@curio.example", placedDaysAgo: 16, lines: [["keychain-power-bank", 2], ["pixel-desk-clock", 1]], progress: { brightworks: "delivered", looplabs: "delivered" } },
  { customer: "customer@curio.example", placedDaysAgo: 12, lines: [["frame-light-charger", 1], ["mini-humidifier", 1], ["pocket-speaker", 1]], progress: { brightworks: "delivered", looplabs: "delivered", kinetic: "shipped" } },
  { customer: "meena@curio.example", placedDaysAgo: 7, lines: [["pixel-light-board", 1], ["illusion-night-light", 2]], progress: { looplabs: "shipped" } },
  { customer: "vignesh@curio.example", placedDaysAgo: 4, lines: [["hand-crank-charger", 1], ["voice-alarm-clock", 1]], progress: { brightworks: "packed", kinetic: "accepted" } },
  { customer: "divya@curio.example", placedDaysAgo: 2, lines: [["paper-lamp-charger", 2]], progress: { brightworks: "accepted" } },
  { customer: "arun@curio.example", placedDaysAgo: 1, lines: [["pixel-desk-clock", 1], ["pocket-speaker", 2]], progress: {} },
  { customer: "customer@curio.example", placedDaysAgo: 0, lines: [["floating-lamp", 1]], progress: {} },
];

/* Karthik's delivered humidifier is left unreviewed on purpose, so a review can be written live in a demo. */
const SEED_REVIEWS = [
  { customer: "divya@curio.example", slug: "floating-lamp", rating: 5, title: "Everyone who visits asks about it", body: "It took me two tries to get it floating, and then it just stays there. The warm glow is lovely in our living room in Adyar and it feels far more expensive than it was." },
  { customer: "divya@curio.example", slug: "glow-speaker-lamp", rating: 4, title: "Cleared up my bedside table", body: "Lamp, speaker, clock and charger in one. The sound is fine for podcasts and soft music, not for a party. Wireless charging works through my phone case." },
  { customer: "arun@curio.example", slug: "keychain-power-bank", rating: 5, title: "Lives on my laptop bag now", body: "Bought two, one for me and one for my wife. It hangs on the bag so I never forget it, and it gets my phone through a full day of travel around the city." },
  { customer: "arun@curio.example", slug: "pixel-desk-clock", rating: 5, title: "Makes me smile every morning", body: "Such a charming little thing on my office desk. The alarm is loud enough and the screen dims nicely at night. I have already ordered a second one as a gift." },
  { customer: "customer@curio.example", slug: "frame-light-charger", rating: 4, title: "Good looking and useful", body: "The wood finish looks great and the light is calm. Charging is a little slower than my wired charger but perfect overnight. Delivery to Anna Nagar took eleven days." },
];

/** Packed box sizes used for demo shipments, picked by total weight. */
function boxFor(weightGrams: number): { lengthCm: number; widthCm: number; heightCm: number } {
  if (weightGrams <= 600) return { lengthCm: 20, widthCm: 15, heightCm: 10 };
  if (weightGrams <= 1200) return { lengthCm: 28, widthCm: 20, heightCm: 14 };
  return { lengthCm: 36, widthCm: 26, heightCm: 18 };
}

/** Days after the order was placed at which each step happened. */
const STEP_AFTER_DAYS: Record<FulfillmentStatus, number> = { new: 0, accepted: 0.4, packed: 1.2, shipped: 2, delivered: 10, cancelled: 0 };

async function advance(db: Db, vendorOrderId: string, target: FulfillmentStatus, weightGrams: number, placedDaysAgo: number): Promise<void> {
  const steps = FLOW.slice(1, FLOW.indexOf(target) + 1);
  if (steps.length === 0) return;
  const reached = (status: FulfillmentStatus): boolean => steps.includes(status);
  const at = (status: FulfillmentStatus): Date => daysAgo(Math.max(placedDaysAgo - STEP_AFTER_DAYS[status], 0));
  const packedWeight = weightGrams + 180;
  await db.vendorOrders.updateOne(
    { _id: vendorOrderId },
    {
      $set: {
        status: target,
        updatedAt: at(target),
        ...(reached("packed") ? { packageCount: 1, weightGrams: packedWeight, ...boxFor(packedWeight) } : {}),
        ...(reached("shipped") ? { carrier: "Placeholder Express", trackingNumber: `PX${vendorOrderId.slice(0, 8).toUpperCase()}`, shippedAt: at("shipped") } : {}),
        ...(reached("delivered") ? { deliveredAt: at("delivered") } : {}),
      },
    },
  );
  await db.fulfillmentEvents.insertMany(steps.map((status) => ({ _id: newId(), vendorOrderId, status, note: null, createdAt: at(status) })));
}

export async function seed(db: Db): Promise<void> {
  const password = process.env.SEED_PASSWORD;
  if (!password) throw new Error("SEED_PASSWORD is not set. Add it to .env.local before seeding demo data.");
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  await db.users.insertOne({ _id: newId(), ...SEED_ADMIN, passwordHash, role: "admin", createdAt: now });
  const customerId = new Map<string, string>(SEED_CUSTOMERS.map((c) => [c.email, newId()]));
  await db.users.insertMany(SEED_CUSTOMERS.map((c) => ({ _id: customerId.get(c.email)!, ...c, passwordHash, role: "customer" as const, createdAt: now })));

  const categoryId = new Map<string, string>(SEED_CATEGORIES.map((c) => [c.slug, newId()]));
  await db.categories.insertMany(SEED_CATEGORIES.map((c) => ({ _id: categoryId.get(c.slug)!, ...c })));

  const vendorId = new Map<string, string>(SEED_VENDORS.map((v) => [v.key, newId()]));
  for (const v of SEED_VENDORS) {
    const ownerId = newId();
    await db.users.insertOne({ _id: ownerId, email: v.email, name: v.ownerName, passwordHash, role: "vendor", createdAt: now });
    await db.vendors.insertOne({
      _id: vendorId.get(v.key)!,
      ownerId,
      name: v.name,
      slug: v.slug,
      countryCode: v.countryCode,
      city: v.city,
      about: v.about,
      contactEmail: v.email,
      contactPhone: "",
      status: "active",
      createdAt: now,
    });
  }
  const vendorKey = new Map([...vendorId].map(([key, id]) => [id, key]));

  // Stagger creation times so "newest first" lists keep a stable, deliberate order.
  const productRows: Product[] = SEED_PRODUCTS.map((p, index) => {
    const createdAt = new Date(now.getTime() - index * 60_000);
    return {
      id: newId(),
      vendorId: vendorId.get(p.vendor)!,
      categoryId: categoryId.get(p.category)!,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      highlights: p.highlights,
      specs: p.specs,
      faqs: p.faqs,
      images: Array.from({ length: p.photos }, (_, i) => `/demo/${p.slug}-${i + 1}.jpg`),
      sku: p.sku,
      priceMinor: p.price * 100,
      compareAtMinor: p.compareAt ? p.compareAt * 100 : null,
      currency: "INR",
      stock: p.stock,
      weightGrams: p.weightGrams,
      originCountry: SEED_VENDORS.find((v) => v.key === p.vendor)!.countryCode,
      status: "active",
      ratingSum: 0,
      ratingCount: 0,
      createdAt,
      updatedAt: createdAt,
    };
  });
  await db.products.insertMany(productRows.map(({ id, ...fields }) => ({ _id: id, ...fields })));
  const bySlug = new Map(productRows.map((p) => [p.slug, p]));
  const weightById = new Map(productRows.map((p) => [p.id, p.weightGrams]));
  const catalog: PricedProduct[] = productRows.map((p) => ({
    id: p.id, vendorId: p.vendorId, name: p.name, image: p.images[0] ?? null,
    priceMinor: p.priceMinor, currency: p.currency, stock: p.stock, purchasable: true,
  }));

  for (const [index, seedOrder] of SEED_ORDERS.entries()) {
    const lines: CartLine[] = seedOrder.lines.map(([slug, quantity]) => ({ productId: bySlug.get(slug)!.id, quantity }));
    const result = buildOrderDraft(lines, catalog);
    if (!result.ok) throw new Error(`Seed order invalid: ${result.errors.join(" ")}`);
    const created = await insertOrder(db, {
      customerId: customerId.get(seedOrder.customer)!,
      marketCountry: "IN",
      draft: result.draft,
      shippingAddress: ADDRESSES[seedOrder.customer],
      payment: { provider: "placeholder", reference: `seed-${index + 1}`, status: "paid" },
    });
    // Backdate the order so the demo shows a few weeks of history.
    const placedAt = daysAgo(seedOrder.placedDaysAgo);
    const vendorOrderIds = [...created.vendorOrderIds];
    await db.orders.updateOne({ _id: created.id }, { $set: { createdAt: placedAt } });
    await db.vendorOrders.updateMany({ orderId: created.id }, { $set: { createdAt: placedAt, updatedAt: placedAt } });
    await db.fulfillmentEvents.updateMany({ vendorOrderId: { $in: vendorOrderIds } }, { $set: { createdAt: placedAt } });
    for (const [i, shipment] of result.draft.shipments.entries()) {
      const target = seedOrder.progress[vendorKey.get(shipment.vendorId)!];
      const weight = shipment.items.reduce((sum, item) => sum + item.quantity * (weightById.get(item.productId) ?? 300), 0);
      if (target) await advance(db, vendorOrderIds[i], target, weight, seedOrder.placedDaysAgo);
    }
  }

  for (const r of SEED_REVIEWS) {
    const product = bySlug.get(r.slug)!;
    const userId = customerId.get(r.customer)!;
    // A seeded review must point at a delivered purchase by the same customer, like a real one.
    const orderIds = (await db.orders.find({ customerId: userId }, { projection: { _id: 1 } }).toArray()).map((o) => o._id);
    const items = await db.orderItems.find({ productId: product.id, orderId: { $in: orderIds } }).toArray();
    const delivered = await db.vendorOrders.findOne({ _id: { $in: items.map((i) => i.vendorOrderId) }, status: "delivered" });
    const item = items.find((i) => i.vendorOrderId === delivered?._id);
    if (!item || !delivered) throw new Error(`Seed review for ${r.slug} has no delivered purchase by ${r.customer}.`);
    const reviewedAt = new Date((delivered.deliveredAt ?? now).getTime() + DAY_MS);
    await db.reviews.insertOne({ _id: newId(), productId: product.id, userId, orderItemId: item._id, rating: r.rating, title: r.title, body: r.body, createdAt: reviewedAt });
    await db.products.updateOne({ _id: product.id }, { $inc: { ratingSum: r.rating, ratingCount: 1 } });
  }
}

/** Load demo data only when the database has no users yet. */
export async function seedIfEmpty(db: Db): Promise<boolean> {
  if ((await db.users.countDocuments()) > 0) return false;
  await seed(db);
  return true;
}
