import { BRAND } from "./brand";

export interface Faq {
  readonly q: string;
  readonly a: string;
}

/** Store-level questions, written answer-first so search and AI assistants can quote them directly. */
export const STORE_FAQS: readonly Faq[] = [
  {
    q: `What is ${BRAND.name}?`,
    a: `${BRAND.name} is a curated online store for inventive, useful electronics. It is not a general marketplace: every product is a specific, hand-picked gadget listed by the vendor that makes or supplies it, and shipped directly from that vendor to customers in India.`,
  },
  {
    q: "Where do the products ship from?",
    a: "Each product ships from the vendor that lists it. Most launch products ship from China; the store works with vendors in 24 countries. The exact city and country are shown on every product page.",
  },
  {
    q: "Do I need an account to shop?",
    a: "No. You can browse and add products to your cart without an account. You only sign in or create an account when you check out, so your order and delivery updates are saved.",
  },
  {
    q: "What happens if I order products from different vendors?",
    a: "Your order is split automatically into one shipment per vendor. Each vendor packs and ships their items separately, and your order page shows the status of every shipment.",
  },
  {
    q: "Can anyone write a review?",
    a: "No. Only customers whose order for that product has been delivered can review it, and each customer can review a product once. Every review on the store is from a verified buyer.",
  },
];
