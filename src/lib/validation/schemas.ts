import { z } from "zod";
import { INDIAN_STATES, VENDOR_COUNTRIES } from "@/lib/config/markets";
import { MAX_QUANTITY_PER_LINE } from "@/lib/domain/cart";

const trimmed = (min: number, max: number, label: string) =>
  z.string().trim().min(min, `${label} is required.`).max(max, `${label} is too long.`);

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.");

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.") });

export const registerSchema = z.object({
  name: trimmed(2, 80, "Name"),
  email: emailSchema,
  password: passwordSchema,
});

export const vendorRegisterSchema = registerSchema.extend({
  businessName: trimmed(2, 80, "Business name"),
  countryCode: z.string().refine((c) => c in VENDOR_COUNTRIES, "Choose a country."),
  city: trimmed(2, 60, "City"),
  contactPhone: z.string().trim().max(20).optional().default(""),
  about: z.string().trim().max(400).optional().default(""),
});

export const addressSchema = z.object({
  fullName: trimmed(2, 80, "Full name"),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number."),
  line1: trimmed(3, 120, "Address"),
  line2: z.string().trim().max(120).optional().default(""),
  city: trimmed(2, 60, "City"),
  state: z.string().refine((s) => INDIAN_STATES.includes(s), "Choose a state."),
  postalCode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a 6-digit PIN code."),
});

export const cartLinesSchema = z
  .array(z.object({ productId: z.uuid(), quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE) }))
  .min(1)
  .max(50);

export const reviewSchema = z.object({
  productId: z.uuid(),
  rating: z.coerce.number().int().min(1, "Choose a rating.").max(5),
  title: trimmed(3, 80, "Title"),
  body: z.string().trim().min(20, "Tell other buyers a little more (20 characters minimum).").max(1500),
});

const positiveInt = (label: string, max: number) =>
  z.coerce.number({ error: `${label} must be a number.` }).int(`${label} must be a whole number.`).min(1, `${label} must be at least 1.`).max(max, `${label} looks too large.`);

export const packageSchema = z.object({
  packageCount: positiveInt("Number of packages", 50),
  weightGrams: positiveInt("Weight", 200_000),
  lengthCm: positiveInt("Length", 300),
  widthCm: positiveInt("Width", 300),
  heightCm: positiveInt("Height", 300),
});

export const shipmentUpdateSchema = z.object({
  vendorOrderId: z.uuid(),
  intent: z.enum(["save", "accepted", "packed", "shipped", "delivered", "cancelled"]),
  carrier: z.string().trim().max(60).optional().default(""),
  trackingNumber: z.string().trim().max(60).optional().default(""),
  vendorNote: z.string().trim().max(500).optional().default(""),
});

const money = (label: string) => z.string().trim().regex(/^\d{1,6}(\.\d{1,2})?$/, `${label} must be a number like 2499 or 2499.50.`);

export const productSchema = z.object({
  name: trimmed(3, 90, "Name"),
  tagline: trimmed(10, 140, "Tagline"),
  description: z.string().trim().min(40, "Describe the product in at least 40 characters.").max(4000),
  categoryId: z.uuid("Choose a category."),
  sku: trimmed(2, 40, "SKU"),
  price: money("Price"),
  compareAt: z.union([z.literal(""), money("Compare-at price")]).optional().default(""),
  stock: z.coerce.number({ error: "Stock must be a number." }).int().min(0, "Stock cannot be negative.").max(1_000_000),
  weightGrams: z.coerce.number({ error: "Weight must be a number." }).int().min(1, "Enter the product weight in grams.").max(200_000),
  highlights: z.string().max(1200).optional().default(""),
  specs: z.string().max(2400).optional().default(""),
  faqs: z.string().max(4000).optional().default(""),
  status: z.enum(["active", "draft"]),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type ProductInput = z.infer<typeof productSchema>;
