import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["customer", "vendor", "admin"]);
export const vendorStatus = pgEnum("vendor_status", ["active", "suspended"]);
export const productStatus = pgEnum("product_status", ["active", "draft", "archived"]);
export const paymentStatus = pgEnum("payment_status", ["pending", "paid", "failed", "refunded"]);
export const fulfillmentStatus = pgEnum("fulfillment_status", [
  "new",
  "accepted",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
]);

export interface ProductSpec {
  label: string;
  value: string;
}
export interface ProductFaq {
  q: string;
  a: string;
}
export interface ShippingAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: userRole("role").notNull().default("customer"),
  createdAt: createdAt(),
});

export const vendors = pgTable(
  "vendors",
  {
    id: id(),
    ownerId: uuid("owner_id").notNull().references(() => users.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    countryCode: text("country_code").notNull(),
    city: text("city").notNull(),
    about: text("about").notNull().default(""),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone").notNull().default(""),
    status: vendorStatus("status").notNull().default("active"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("vendors_owner_idx").on(t.ownerId), index("vendors_country_idx").on(t.countryCode)],
);

export const categories = pgTable("categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  blurb: text("blurb").notNull().default(""),
  sort: integer("sort").notNull().default(0),
});

export const products = pgTable(
  "products",
  {
    id: id(),
    vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
    categoryId: uuid("category_id").notNull().references(() => categories.id),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description").notNull(),
    highlights: jsonb("highlights").$type<string[]>().notNull().default([]),
    specs: jsonb("specs").$type<ProductSpec[]>().notNull().default([]),
    faqs: jsonb("faqs").$type<ProductFaq[]>().notNull().default([]),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    sku: text("sku").notNull(),
    /** Price in minor units (paise for INR). Never store money as floats. */
    priceMinor: integer("price_minor").notNull(),
    compareAtMinor: integer("compare_at_minor"),
    currency: text("currency").notNull().default("INR"),
    stock: integer("stock").notNull().default(0),
    weightGrams: integer("weight_grams").notNull().default(0),
    originCountry: text("origin_country").notNull(),
    status: productStatus("status").notNull().default("active"),
    ratingSum: integer("rating_sum").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("products_vendor_idx").on(t.vendorId),
    index("products_category_idx").on(t.categoryId),
    index("products_status_idx").on(t.status),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: id(),
    number: text("number").notNull().unique(),
    customerId: uuid("customer_id").notNull().references(() => users.id),
    marketCountry: text("market_country").notNull(),
    currency: text("currency").notNull(),
    subtotalMinor: integer("subtotal_minor").notNull(),
    shippingMinor: integer("shipping_minor").notNull().default(0),
    dutiesMinor: integer("duties_minor").notNull().default(0),
    totalMinor: integer("total_minor").notNull(),
    paymentStatus: paymentStatus("payment_status").notNull().default("pending"),
    paymentProvider: text("payment_provider").notNull(),
    paymentRef: text("payment_ref"),
    shippingAddress: jsonb("shipping_address").$type<ShippingAddress>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("orders_customer_idx").on(t.customerId), index("orders_created_idx").on(t.createdAt)],
);

/** One per vendor per order: the unit a vendor fulfils and ships. */
export const vendorOrders = pgTable(
  "vendor_orders",
  {
    id: id(),
    orderId: uuid("order_id").notNull().references(() => orders.id),
    vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
    status: fulfillmentStatus("status").notNull().default("new"),
    subtotalMinor: integer("subtotal_minor").notNull(),
    packageCount: integer("package_count"),
    weightGrams: integer("weight_grams"),
    lengthCm: integer("length_cm"),
    widthCm: integer("width_cm"),
    heightCm: integer("height_cm"),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    vendorNote: text("vendor_note"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (t) => [
    index("vendor_orders_order_idx").on(t.orderId),
    index("vendor_orders_vendor_idx").on(t.vendorId, t.status),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: uuid("order_id").notNull().references(() => orders.id),
    vendorOrderId: uuid("vendor_order_id").notNull().references(() => vendorOrders.id),
    productId: uuid("product_id").notNull().references(() => products.id),
    name: text("name").notNull(),
    image: text("image"),
    unitPriceMinor: integer("unit_price_minor").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    index("order_items_vendor_order_idx").on(t.vendorOrderId),
    index("order_items_product_idx").on(t.productId),
  ],
);

export const fulfillmentEvents = pgTable(
  "fulfillment_events",
  {
    id: id(),
    vendorOrderId: uuid("vendor_order_id").notNull().references(() => vendorOrders.id),
    status: fulfillmentStatus("status").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("fulfillment_events_vo_idx").on(t.vendorOrderId)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: id(),
    productId: uuid("product_id").notNull().references(() => products.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    /** The delivered purchase that proves this reviewer bought the product. */
    orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id),
    rating: integer("rating").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("reviews_one_per_buyer_idx").on(t.productId, t.userId)],
);

export const usersRelations = relations(users, ({ one }) => ({
  vendor: one(vendors, { fields: [users.id], references: [vendors.ownerId] }),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  owner: one(users, { fields: [vendors.ownerId], references: [users.id] }),
  products: many(products),
  vendorOrders: many(vendorOrders),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  vendor: one(vendors, { fields: [products.vendorId], references: [vendors.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  reviews: many(reviews),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, { fields: [orders.customerId], references: [users.id] }),
  vendorOrders: many(vendorOrders),
  items: many(orderItems),
}));

export const vendorOrdersRelations = relations(vendorOrders, ({ one, many }) => ({
  order: one(orders, { fields: [vendorOrders.orderId], references: [orders.id] }),
  vendor: one(vendors, { fields: [vendorOrders.vendorId], references: [vendors.id] }),
  items: many(orderItems),
  events: many(fulfillmentEvents),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  vendorOrder: one(vendorOrders, { fields: [orderItems.vendorOrderId], references: [vendorOrders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const fulfillmentEventsRelations = relations(fulfillmentEvents, ({ one }) => ({
  vendorOrder: one(vendorOrders, { fields: [fulfillmentEvents.vendorOrderId], references: [vendorOrders.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type VendorOrder = typeof vendorOrders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type FulfillmentStatus = (typeof fulfillmentStatus.enumValues)[number];
export type UserRole = (typeof userRole.enumValues)[number];
