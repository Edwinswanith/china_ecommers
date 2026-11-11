import type { Binary } from "mongodb";

/**
 * The shape of every record in the store. Each interface is one MongoDB
 * collection. Records link to each other by id, and ids are UUID strings
 * (stored as `_id` in MongoDB, exposed as `id` to the rest of the app).
 */

export const USER_ROLES = ["customer", "vendor", "admin"] as const;
export const VENDOR_STATUSES = ["active", "suspended"] as const;
export const PRODUCT_STATUSES = ["active", "draft", "archived"] as const;
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export const FULFILLMENT_STATUSES = ["new", "accepted", "packed", "shipped", "delivered", "cancelled"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type VendorStatus = (typeof VENDOR_STATUSES)[number];
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

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

export interface User {
  id: string;
  /** Unique. */
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export interface Vendor {
  id: string;
  /** Unique: one vendor profile per user. */
  ownerId: string;
  name: string;
  /** Unique. */
  slug: string;
  countryCode: string;
  city: string;
  about: string;
  contactEmail: string;
  contactPhone: string;
  status: VendorStatus;
  createdAt: Date;
}

export interface Category {
  id: string;
  /** Unique. */
  slug: string;
  name: string;
  blurb: string;
  sort: number;
}

export interface Product {
  id: string;
  vendorId: string;
  categoryId: string;
  /** Unique. */
  slug: string;
  name: string;
  tagline: string;
  description: string;
  highlights: string[];
  specs: ProductSpec[];
  faqs: ProductFaq[];
  images: string[];
  sku: string;
  /** Price in minor units (paise for INR). Never store money as floats. */
  priceMinor: number;
  compareAtMinor: number | null;
  currency: string;
  stock: number;
  weightGrams: number;
  originCountry: string;
  status: ProductStatus;
  /** Who removed an archived product. A vendor can only undo their own removal, never an admin takedown. */
  archivedBy?: "vendor" | "admin" | null;
  /** What the product was before it was archived, so an undo can put it back. */
  statusBeforeArchive?: ProductStatus | null;
  ratingSum: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  /** Unique, customer-facing, e.g. CS-7K2M9QXA. */
  number: string;
  customerId: string;
  marketCountry: string;
  currency: string;
  subtotalMinor: number;
  shippingMinor: number;
  dutiesMinor: number;
  totalMinor: number;
  paymentStatus: PaymentStatus;
  paymentProvider: string;
  paymentRef: string | null;
  shippingAddress: ShippingAddress;
  createdAt: Date;
}

/** One per vendor per order: the unit a vendor fulfils and ships. */
export interface VendorOrder {
  id: string;
  orderId: string;
  vendorId: string;
  status: FulfillmentStatus;
  subtotalMinor: number;
  packageCount: number | null;
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  carrier: string | null;
  trackingNumber: string | null;
  vendorNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  shippedAt: Date | null;
  deliveredAt: Date | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  vendorOrderId: string;
  productId: string;
  name: string;
  image: string | null;
  unitPriceMinor: number;
  quantity: number;
}

export interface FulfillmentEvent {
  id: string;
  vendorOrderId: string;
  status: FulfillmentStatus;
  note: string | null;
  createdAt: Date;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  /** The delivered purchase that proves this reviewer bought the product. */
  orderItemId: string;
  rating: number;
  title: string;
  body: string;
  createdAt: Date;
}

/** An uploaded product photo, stored in the database so it survives on serverless hosting. */
export interface MediaFile {
  /** The file name, e.g. 3f2a….webp. */
  id: string;
  contentType: string;
  data: Binary;
  createdAt: Date;
}
