import "server-only";
import type { Filter } from "mongodb";
import { byId, fromDoc, getDb, type Db, type Doc } from "@/lib/db/client";
import type { Category, Product } from "@/lib/db/schema";

export interface ProductListing extends Product {
  readonly vendor: { readonly name: string; readonly slug: string; readonly countryCode: string; readonly city: string };
  readonly category: { readonly name: string; readonly slug: string };
}

export type ProductSort = "newest" | "price-asc" | "price-desc" | "rating";

export interface ProductFilter {
  readonly categorySlug?: string;
  readonly query?: string;
  readonly sort?: ProductSort;
  readonly limit?: number;
}

type ProductFilterDoc = Filter<Doc<Product>>;

const DEFAULT_LIMIT = 200;
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const averageRating = (p: Product): number => (p.ratingCount === 0 ? 0 : p.ratingSum / p.ratingCount);

/** Publicly visible = product is active and its vendor is not suspended. */
async function visibleFilter(db: Db): Promise<ProductFilterDoc> {
  const suspended = await db.vendors.find({ status: "suspended" }, { projection: { _id: 1 } }).toArray();
  return { status: "active", vendorId: { $nin: suspended.map((v) => v._id) } };
}

/** Attach the vendor and category summary each listing shows. */
async function toListings(db: Db, docs: ReadonlyArray<Doc<Product>>): Promise<ProductListing[]> {
  const items = docs.map((doc) => fromDoc<Product>(doc));
  const [vendors, categories] = await Promise.all([
    byId(db.vendors, items.map((p) => p.vendorId)),
    byId(db.categories, items.map((p) => p.categoryId)),
  ]);
  return items.flatMap((product) => {
    const vendor = vendors.get(product.vendorId);
    const category = categories.get(product.categoryId);
    if (!vendor || !category) return [];
    return [
      {
        ...product,
        vendor: { name: vendor.name, slug: vendor.slug, countryCode: vendor.countryCode, city: vendor.city },
        category: { name: category.name, slug: category.slug },
      },
    ];
  });
}

export async function listProducts(filter: ProductFilter = {}): Promise<ProductListing[]> {
  const db = await getDb();
  const conditions: ProductFilterDoc[] = [await visibleFilter(db)];
  if (filter.categorySlug) {
    const category = await db.categories.findOne({ slug: filter.categorySlug }, { projection: { _id: 1 } });
    if (!category) return [];
    conditions.push({ categoryId: category._id });
  }
  const query = filter.query?.trim().slice(0, 80);
  if (query) {
    const pattern = { $regex: escapeRegex(query), $options: "i" };
    conditions.push({ $or: [{ name: pattern }, { tagline: pattern }, { description: pattern }] });
  }

  const sort = filter.sort ?? "newest";
  const limit = filter.limit ?? DEFAULT_LIMIT;
  const cursor = db.products.find({ $and: conditions });
  if (sort === "rating") {
    // Average rating is derived, so rank in memory. The catalogue is curated and small.
    const listings = await toListings(db, await cursor.limit(DEFAULT_LIMIT).toArray());
    return [...listings].sort((a, b) => averageRating(b) - averageRating(a) || b.ratingCount - a.ratingCount).slice(0, limit);
  }
  const order: Record<Exclude<ProductSort, "rating">, Record<string, 1 | -1>> = {
    newest: { createdAt: -1, _id: 1 },
    "price-asc": { priceMinor: 1, _id: 1 },
    "price-desc": { priceMinor: -1, _id: 1 },
  };
  return toListings(db, await cursor.sort(order[sort]).limit(limit).toArray());
}

export async function getProductBySlug(slug: string): Promise<ProductListing | null> {
  const db = await getDb();
  const doc = await db.products.findOne({ $and: [await visibleFilter(db), { slug }] });
  if (!doc) return null;
  const [listing] = await toListings(db, [doc]);
  return listing ?? null;
}

export async function getProductsByIds(ids: readonly string[]): Promise<ProductListing[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  const docs = await db.products.find({ $and: [await visibleFilter(db), { _id: { $in: [...ids] } }] }).toArray();
  return toListings(db, docs);
}

/** Other products to show on a product page: same category first, then the newest of the rest. */
export async function listRelatedProducts(product: ProductListing, limit = 3): Promise<ProductListing[]> {
  const db = await getDb();
  const visible = await visibleFilter(db);
  const others: ProductFilterDoc = { _id: { $ne: product.id } };
  const sameCategory = await db.products
    .find({ $and: [visible, others, { categoryId: product.categoryId }] })
    .sort({ createdAt: -1, _id: 1 })
    .limit(limit)
    .toArray();
  const remaining = limit - sameCategory.length;
  const rest =
    remaining > 0
      ? await db.products
          .find({ $and: [visible, others, { categoryId: { $ne: product.categoryId } }] })
          .sort({ createdAt: -1, _id: 1 })
          .limit(remaining)
          .toArray()
      : [];
  return toListings(db, [...sameCategory, ...rest]);
}

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const docs = await db.categories.find().sort({ sort: 1 }).toArray();
  return docs.map((doc) => fromDoc<Category>(doc));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const db = await getDb();
  const doc = await db.categories.findOne({ slug });
  return doc ? fromDoc<Category>(doc) : null;
}

export interface PublicReview {
  readonly id: string;
  readonly rating: number;
  readonly title: string;
  readonly body: string;
  readonly createdAt: Date;
  readonly authorName: string;
}

/** Show first name and last initial only. */
function publicName(fullName: string): string {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const initial = rest.length > 0 ? ` ${rest[rest.length - 1][0]}.` : "";
  return `${first}${initial}`;
}

export async function listReviews(productId: string): Promise<PublicReview[]> {
  const db = await getDb();
  const docs = await db.reviews.find({ productId }).sort({ createdAt: -1 }).limit(100).toArray();
  const authors = await byId(db.users, docs.map((r) => r.userId));
  return docs.map((r) => ({
    id: r._id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    createdAt: r.createdAt,
    authorName: publicName(authors.get(r.userId)?.name ?? "Customer"),
  }));
}
