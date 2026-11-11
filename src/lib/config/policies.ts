/**
 * PLACEHOLDER policy copy. Customs, shipping/tracking and returns are owned by
 * other teams; replace each `body` with the approved text when it is ready.
 */
export interface Policy {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly placeholder: boolean;
  readonly body: readonly { readonly heading: string; readonly text: string }[];
}

export const POLICIES: readonly Policy[] = [
  {
    slug: "shipping",
    title: "Shipping & delivery",
    summary: "How orders travel from the vendor to your door in India.",
    placeholder: true,
    body: [
      { heading: "Where orders ship from", text: "Every product is shipped by the vendor that lists it, directly from their own country. The product page always shows the city and country an item ships from." },
      { heading: "Orders with items from several vendors", text: "If your cart has products from more than one vendor, each vendor ships their part separately. You will see one shipment per vendor on your order page, each with its own status." },
      { heading: "Delivery times and tracking", text: "Final delivery timelines, carriers and live tracking are being set up by our logistics team. Until then, your order page shows the status each vendor reports: accepted, packed, shipped and delivered." },
      { heading: "Customs and import duties", text: "Customs handling for shipments into India is being finalised. This section will state clearly whether duties are included in the price before checkout opens to the public." },
    ],
  },
  {
    slug: "returns",
    title: "Returns & refunds",
    summary: "What happens if something arrives damaged or is not right.",
    placeholder: true,
    body: [
      { heading: "Status", text: "The returns and refunds process for cross-border orders is being finalised. The approved policy will be published here before launch." },
      { heading: "In the meantime", text: "If an order arrives damaged or incorrect, contact support with your order number and photographs and we will resolve it with the vendor." },
    ],
  },
  {
    slug: "terms",
    title: "Terms & conditions",
    summary: "The terms that apply when you buy from or sell on this store.",
    placeholder: true,
    body: [
      { heading: "Status", text: "These terms are a placeholder and will be replaced with the reviewed legal text before launch." },
      { heading: "Who you are buying from", text: "Products are listed and sold by independent vendors. The vendor named on each product page is the seller of that product and is responsible for its description and fulfilment." },
      { heading: "Reviews", text: "Only customers whose order for a product has been delivered can review it. Each customer can review a product once." },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy",
    summary: "What we collect and who sees it.",
    placeholder: true,
    body: [
      { heading: "Status", text: "This privacy notice is a placeholder and will be replaced with the reviewed text before launch." },
      { heading: "What vendors see", text: "When you place an order, the vendor fulfilling it receives your name, phone number and delivery address so they can ship it. They do not receive your email address or payment details." },
    ],
  },
];

export function getPolicy(slug: string): Policy | null {
  return POLICIES.find((p) => p.slug === slug) ?? null;
}
