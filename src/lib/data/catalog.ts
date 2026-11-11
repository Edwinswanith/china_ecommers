import "server-only";
import { and, asc, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { categories, products, reviews, users, vendors, type Category, type Product } from "@/lib/db/schema";

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

const listingColumns = {
  product: products,
  vendor: { name: vendors.name, slug: vendors.slug, countryCode: vendors.countryCode, city: vendors.city },
  category: { name: categories.name, slug: categories.slug },
};

/** Publicly visible = product is active and its vendor is not suspended. */
const VISIBLE = and(eq(products.status, "active"), eq(vendors.status, "active"));

const ORDERINGS: Readonly<Record<ProductSort, SQL[]>> = {
  newest: [desc(products.createdAt)],
  "price-asc": [asc(products.priceMinor)],
  "price-desc": [desc(products.priceMinor)],
  rating: [desc(sql`case when ${products.ratingCount} = 0 then 0 else ${products.ratingSum}::float / ${products.ratingCount} end`), desc(products.ratingCount)],
};

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (c) => `\\${c}`);

function baseQuery(db: Awaited<ReturnType<typeof getDb>>) {
  return db
    .select(listingColumns)
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .innerJoin(categories, eq(products.categoryId, categories.id));
}

type ListingRow = { product: Product; vendor: ProductListing["vendor"]; category: ProductListing["category"] };
const toListing = (row: ListingRow): ProductListing => ({ ...row.product, vendor: row.vendor, category: row.category });

export async function listProducts(filter: ProductFilter = {}): Promise<ProductListing[]> {
  const db = await getDb();
  const conditions: Array<SQL | undefined> = [VISIBLE];
  if (filter.categorySlug) conditions.push(eq(categories.slug, filter.categorySlug));
  const query = filter.query?.trim().slice(0, 80);
  if (query) {
    const pattern = `%${escapeLike(query)}%`;
    conditions.push(or(ilike(products.name, pattern), ilike(products.tagline, pattern), ilike(products.description, pattern)));
  }
  const rows = await baseQuery(db)
    .where(and(...conditions))
    .orderBy(...ORDERINGS[filter.sort ?? "newest"])
    .limit(filter.limit ?? 200);
  return rows.map(toListing);
}

export async function getProductBySlug(slug: string): Promise<ProductListing | null> {
  const db = await getDb();
  const [row] = await baseQuery(db).where(and(VISIBLE, eq(products.slug, slug))).limit(1);
  return row ? toListing(row) : null;
}

export async function getProductsByIds(ids: readonly string[]): Promise<ProductListing[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  const rows = await baseQuery(db).where(and(VISIBLE, inArray(products.id, [...ids])));
  return rows.map(toListing);
}

export async function listRelatedProducts(product: ProductListing, limit = 3): Promise<ProductListing[]> {
  const db = await getDb();
  const rows = await baseQuery(db)
    .where(and(VISIBLE, ne(products.id, product.id)))
    .orderBy(desc(sql`(${products.categoryId} = ${product.categoryId})::int`), desc(products.createdAt))
    .limit(limit);
  return rows.map(toListing);
}

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  return db.select().from(categories).orderBy(asc(categories.sort));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const db = await getDb();
  const [row] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return row ?? null;
}

export interface PublicReview {
  readonly id: string;
  readonly rating: number;
  readonly title: string;
  readonly body: string;
  readonly createdAt: Date;
  readonly authorName: string;
}

export async function listReviews(productId: string): Promise<PublicReview[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: reviews.id, rating: reviews.rating, title: reviews.title, body: reviews.body, createdAt: reviews.createdAt, authorName: users.name })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.productId, productId))
    .orderBy(desc(reviews.createdAt))
    .limit(100);
  // Show first name and last initial only.
  return rows.map((r) => {
    const [first, ...rest] = r.authorName.trim().split(/\s+/);
    const initial = rest.length > 0 ? ` ${rest[rest.length - 1][0]}.` : "";
    return { ...r, authorName: `${first}${initial}` };
  });
}
