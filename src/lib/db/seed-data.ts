import type { ProductFaq, ProductSpec } from "./schema";

export interface SeedVendor {
  key: string;
  email: string;
  ownerName: string;
  name: string;
  slug: string;
  countryCode: string;
  city: string;
  about: string;
}

export interface SeedProduct {
  vendor: string;
  category: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  highlights: string[];
  specs: ProductSpec[];
  faqs: ProductFaq[];
  sku: string;
  price: number;
  compareAt?: number;
  stock: number;
  weightGrams: number;
  /** How many photos exist in public/demo for this product (slug-1.jpg, slug-2.jpg). */
  photos: number;
}

export const SEED_CATEGORIES = [
  { slug: "desk", name: "Desk & Workspace", blurb: "Small machines that make a desk nicer to sit at.", sort: 1 },
  { slug: "carry", name: "Travel & Carry", blurb: "Pocketable power and comforts for the road.", sort: 2 },
  { slug: "home", name: "Home & Ambient", blurb: "Objects that change how a room feels.", sort: 3 },
  { slug: "audio", name: "Audio & Play", blurb: "Sound, but not the way you expect it.", sort: 4 },
] as const;

export const SEED_VENDORS: SeedVendor[] = [
  {
    key: "brightworks",
    email: "vendor.brightworks@curio.example",
    ownerName: "Lin Wei",
    name: "Shenzhen Brightworks",
    slug: "shenzhen-brightworks",
    countryCode: "CN",
    city: "Shenzhen",
    about: "A twelve-person studio in Nanshan building lighting and power hardware since 2016.",
  },
  {
    key: "looplabs",
    email: "vendor.looplabs@curio.example",
    ownerName: "Chen Yu",
    name: "Loop Labs Hangzhou",
    slug: "loop-labs-hangzhou",
    countryCode: "CN",
    city: "Hangzhou",
    about: "Makers of compact desk gadgets, designed and assembled beside West Lake.",
  },
  {
    key: "kinetic",
    email: "vendor.kinetic@curio.example",
    ownerName: "Park Ji-ho",
    name: "Seoul Kinetic",
    slug: "seoul-kinetic",
    countryCode: "KR",
    city: "Seoul",
    about: "Independent product lab focused on calm technology for everyday routines.",
  },
];

const shippingFaq: ProductFaq = {
  q: "How long does delivery to India take?",
  a: "Orders ship directly from the vendor. Typical delivery to Indian metros is 8 to 14 days; exact timelines are confirmed once tracking is assigned.",
};

/*
 * DEMO CATALOGUE. Product types, photos (public/demo) and rough specifications
 * are placeholders sourced from public supplier listings so the store can be
 * shown with realistic content. Names, copy and prices are written for the demo.
 * Replace every entry and photo with the vendors' own before a public launch.
 */
export const SEED_PRODUCTS: SeedProduct[] = [
  {
    vendor: "brightworks",
    category: "home",
    slug: "floating-lamp",
    name: "Fortune Floating Lamp",
    tagline: "A glowing block that hovers and slowly spins above its base.",
    description:
      "The light block floats on a magnetic field a couple of centimetres above the base and is powered through the air, with no wire attached. It gives a soft warm glow that suits a desk, a shop counter or a living-room shelf, and it keeps turning gently on its own.",
    highlights: [
      "Magnetic levitation with a wire-free light",
      "Warm white glow that is easy on the eyes",
      "Rotates slowly and silently while it floats",
      "One-touch on and off from the base",
    ],
    specs: [
      { label: "Light", value: "Warm white LED" },
      { label: "Power", value: "12 V adapter included" },
      { label: "Floating gap", value: "About 15 mm" },
      { label: "Base size", value: "135 × 135 × 30 mm" },
      { label: "Weight", value: "950 g" },
      { label: "Warranty", value: "12 months" },
    ],
    faqs: [
      { q: "What happens if the power goes out?", a: "The block drops gently onto the base. It is built for this and is not damaged. Lift it back into place once the power returns." },
      { q: "Is it hard to set up?", a: "Hold the block level above the centre of the base and lower it slowly until you feel it catch. Most people get it within a minute." },
      shippingFaq,
    ],
    sku: "BW-FLT-01",
    price: 6999,
    compareAt: 7999,
    stock: 40,
    weightGrams: 950,
    photos: 2,
  },
  {
    vendor: "brightworks",
    category: "home",
    slug: "frame-light-charger",
    name: "Glow Frame Charging Light",
    tagline: "A wooden picture light that charges your phone when you rest it on top.",
    description:
      "A small lit landscape in a wooden frame that doubles as a wireless charger. Place your phone on the top and it starts charging; tap to move between three light colours. It replaces a bedside lamp and a charging pad with one calm object.",
    highlights: [
      "15 W wireless charging on the top surface",
      "Three light colours: warm, neutral and cool",
      "Wood-finish frame that suits a bedside or desk",
      "Powered by USB-C",
    ],
    specs: [
      { label: "Wireless charging", value: "Up to 15 W" },
      { label: "Light modes", value: "3 colours, touch control" },
      { label: "Input", value: "USB-C" },
      { label: "Size", value: "240 × 90 × 110 mm" },
      { label: "Weight", value: "480 g" },
      { label: "Warranty", value: "12 months" },
    ],
    faqs: [
      { q: "Will it charge my phone?", a: "It charges any phone that supports wireless charging, including recent iPhone and Samsung Galaxy models. Thick or metal cases may need to be removed." },
      { q: "Can the light be used without charging?", a: "Yes. The light and the charger work independently." },
      shippingFaq,
    ],
    sku: "BW-FRM-02",
    price: 2999,
    compareAt: 3499,
    stock: 80,
    weightGrams: 480,
    photos: 2,
  },
  {
    vendor: "brightworks",
    category: "home",
    slug: "paper-lamp-charger",
    name: "Origami Touch Lamp",
    tagline: "A folded paper-style lamp with a wireless charging base.",
    description:
      "A sculpted shade that looks like folded paper sits on a base that charges your phone wirelessly. Touch the base to switch it on and set the brightness. It gives a soft, even light that works well as a bedside or reading-corner lamp.",
    highlights: [
      "Soft diffused light through a folded shade",
      "Wireless charging pad built into the base",
      "Touch control with stepped brightness",
      "Makes a thoughtful gift",
    ],
    specs: [
      { label: "Light", value: "Warm white LED, dimmable" },
      { label: "Wireless charging", value: "Up to 10 W" },
      { label: "Input", value: "USB-C" },
      { label: "Size", value: "120 × 120 × 210 mm" },
      { label: "Weight", value: "390 g" },
      { label: "Warranty", value: "12 months" },
    ],
    faqs: [
      { q: "Is the shade made of real paper?", a: "No. It is a durable translucent material shaped to look like folded paper, so it can be wiped clean." },
      { q: "Is a power adapter included?", a: "A USB-C cable is included. Use any standard phone adapter of 10 W or more." },
      shippingFaq,
    ],
    sku: "BW-ORI-03",
    price: 1499,
    stock: 120,
    weightGrams: 390,
    photos: 2,
  },
  {
    vendor: "brightworks",
    category: "carry",
    slug: "keychain-power-bank",
    name: "Clip Power Bank 7500",
    tagline: "A soft-touch power bank that clips to your bag and is always with you.",
    description:
      "A compact 7500 mAh power bank with a built-in carabiner, so it hangs from a backpack, belt loop or handbag instead of getting lost at the bottom. Enough for roughly one and a half phone charges on the go.",
    highlights: [
      "7500 mAh capacity in a pocketable body",
      "Built-in carabiner clip",
      "Soft-touch finish that does not scratch your phone",
      "Charges by USB-C",
    ],
    specs: [
      { label: "Capacity", value: "7500 mAh" },
      { label: "Output", value: "USB-C and USB-A" },
      { label: "Recharge time", value: "About 3 hours" },
      { label: "Size", value: "95 × 62 × 22 mm" },
      { label: "Weight", value: "160 g" },
      { label: "Warranty", value: "12 months" },
    ],
    faqs: [
      { q: "Can I carry it on a flight?", a: "Yes, in cabin baggage. It is well under the airline limit for power banks." },
      { q: "How many charges will I get?", a: "About one and a half full charges for most current phones." },
      shippingFaq,
    ],
    sku: "BW-CLP-04",
    price: 1799,
    stock: 90,
    weightGrams: 160,
    photos: 2,
  },
  {
    vendor: "brightworks",
    category: "carry",
    slug: "hand-crank-charger",
    name: "Ranger Hand-Crank Power Radio",
    tagline: "A metal emergency radio, torch and phone charger you can power by hand.",
    description:
      "Built for power cuts, monsoon season and camping trips. Wind the handle or leave it in the sun to top up the built-in battery, then use it as a radio, a bright torch or a USB charger for your phone. The aluminium body is made to take knocks.",
    highlights: [
      "Charge by hand crank, solar panel or USB",
      "Built-in FM radio and LED torch",
      "USB output to top up a phone in an emergency",
      "Rugged aluminium casing",
    ],
    specs: [
      { label: "Charging", value: "Hand crank, solar, USB" },
      { label: "Functions", value: "Radio, torch, USB power" },
      { label: "Casing", value: "Aluminium" },
      { label: "Size", value: "150 × 80 × 85 mm" },
      { label: "Weight", value: "720 g" },
      { label: "Warranty", value: "12 months" },
    ],
    faqs: [
      { q: "How long do I need to crank?", a: "About one minute of winding gives several minutes of radio or torch use. For a phone, use it as an emergency top-up rather than a full charge." },
      { q: "Is it waterproof?", a: "It is splash resistant, not waterproof. Keep it out of heavy rain and do not submerge it." },
      shippingFaq,
    ],
    sku: "BW-RNG-05",
    price: 4499,
    stock: 35,
    weightGrams: 720,
    photos: 2,
  },
  {
    vendor: "looplabs",
    category: "desk",
    slug: "pixel-desk-clock",
    name: "Retro Pixel Desk Clock",
    tagline: "A tiny vintage-computer clock with a friendly pixel face.",
    description:
      "Shaped like a classic desktop computer from the 1980s, this little clock shows the time on a crisp pixel screen and greets you with a smile. Set several alarms, adjust the brightness, and run it from USB or its own battery.",
    highlights: [
      "Vintage computer design with a pixel display",
      "Multiple alarms with adjustable volume",
      "Runs on USB power or its built-in battery",
      "Adjustable screen brightness for night use",
    ],
    specs: [
      { label: "Display", value: "Monochrome pixel screen" },
      { label: "Alarms", value: "Multiple, adjustable" },
      { label: "Power", value: "USB-C, rechargeable battery" },
      { label: "Size", value: "80 × 85 × 100 mm" },
      { label: "Weight", value: "210 g" },
      { label: "Warranty", value: "12 months" },
    ],
    faqs: [
      { q: "Does it keep time when unplugged?", a: "Yes. The built-in battery keeps the clock and alarms running when it is not plugged in." },
      { q: "Can the screen be dimmed at night?", a: "Yes, the brightness can be lowered so it does not disturb sleep." },
      shippingFaq,
    ],
    sku: "LL-PXC-06",
    price: 1899,
    stock: 150,
    weightGrams: 210,
    photos: 1,
  },
  {
    vendor: "looplabs",
    category: "desk",
    slug: "pixel-light-board",
    name: "Pixel Art Light Board",
    tagline: "Build bead pictures on a light-up board, guided step by step by an app.",
    description:
      "A rechargeable pegboard that lights up from below to show exactly where each bead goes. Choose a design in the app, follow the glowing guide and finish with a picture you can display. A calm, screen-light craft for children and adults.",
    highlights: [
      "Light-up guide shows where each bead goes",
      "App with ready-made designs",
      "Rechargeable, no cable needed while crafting",
      "Suitable for ages 6 and up",
    ],
    specs: [
      { label: "Board", value: "Backlit pegboard, ABS and PC" },
      { label: "App", value: "iOS and Android" },
      { label: "Power", value: "Rechargeable, USB-C" },
      { label: "Size", value: "160 × 160 × 18 mm" },
      { label: "Weight", value: "340 g" },
      { label: "Warranty", value: "12 months" },
    ],
    faqs: [
      { q: "Are beads included?", a: "A starter set of coloured beads is included. It also works with standard 5 mm fuse beads." },
      { q: "Can it be used without the app?", a: "Yes, as a plain lit pegboard. The app is needed for the guided designs." },
      shippingFaq,
    ],
    sku: "LL-PXB-07",
    price: 2299,
    stock: 90,
    weightGrams: 340,
    photos: 2,
  },
  {
    vendor: "looplabs",
    category: "desk",
    slug: "mini-humidifier",
    name: "Bottle-Top Mini Humidifier",
    tagline: "Turns any water bottle into a quiet desk humidifier.",
    description:
      "A pocket-sized ultrasonic humidifier that works with an ordinary water bottle. Stand it on your desk for a fine cool mist that helps in air-conditioned rooms, then slip it into a bag when you travel. It is rechargeable, so it runs without a cable.",
    highlights: [
      "Works with a standard water bottle",
      "Quiet ultrasonic cool mist",
      "Rechargeable and travel friendly",
      "Switches off automatically when the water runs out",
    ],
    specs: [
      { label: "Type", value: "Ultrasonic cool mist" },
      { label: "Runtime", value: "Up to 6 hours per charge" },
      { label: "Power", value: "Rechargeable, USB-C" },
      { label: "Size", value: "95 × 55 × 40 mm" },
      { label: "Weight", value: "120 g" },
      { label: "Warranty", value: "6 months" },
    ],
    faqs: [
      { q: "Is the bottle included?", a: "No. It is designed to work with the ordinary 500 ml water bottles you already have." },
      { q: "Can I add essential oils?", a: "We recommend plain drinking water only, as oils can block the mist outlet." },
      shippingFaq,
    ],
    sku: "LL-HMD-08",
    price: 899,
    compareAt: 1199,
    stock: 40,
    weightGrams: 120,
    photos: 2,
  },
  {
    vendor: "looplabs",
    category: "home",
    slug: "illusion-night-light",
    name: "3D Illusion Night Light",
    tagline: "A flat acrylic panel that looks like a glowing 3D headphone sculpture.",
    description:
      "Fine lines etched into a flat acrylic sheet catch the light from the base and create a convincing 3D shape. Touch the base to move through seven colours. A good-looking night light for a music lover's room or desk.",
    highlights: [
      "Striking 3D effect from a flat panel",
      "Seven colours, changed with a touch",
      "Stays cool, safe for children's rooms",
      "USB powered",
    ],
    specs: [
      { label: "Colours", value: "7, touch control" },
      { label: "Power", value: "USB cable included" },
      { label: "Material", value: "Acrylic panel, ABS base" },
      { label: "Size", value: "150 × 85 × 220 mm" },
      { label: "Weight", value: "260 g" },
      { label: "Warranty", value: "6 months" },
    ],
    faqs: [
      { q: "Is it bright enough to read by?", a: "No. It is a decorative night light with a gentle glow, not a reading lamp." },
      { q: "Does it get hot?", a: "No. The LEDs run cool, so it is safe to leave on overnight." },
      shippingFaq,
    ],
    sku: "LL-ILN-09",
    price: 799,
    stock: 300,
    weightGrams: 260,
    photos: 1,
  },
  {
    vendor: "kinetic",
    category: "audio",
    slug: "glow-speaker-lamp",
    name: "G-Glow Speaker Lamp",
    tagline: "A colour lamp, Bluetooth speaker, clock and wireless charger in one.",
    description:
      "One object that clears your bedside table. The curved light changes colour to suit your mood, the speaker plays music from your phone, the clock wakes you up, and the pad in the middle charges your phone wirelessly while you sleep.",
    highlights: [
      "Colour-changing ambient light",
      "Bluetooth speaker with alarm clock",
      "Wireless charging pad for your phone",
      "Control from the buttons or the app",
    ],
    specs: [
      { label: "Speaker", value: "Bluetooth, 5 W" },
      { label: "Wireless charging", value: "Up to 15 W" },
      { label: "Light", value: "RGB with preset scenes" },
      { label: "Size", value: "240 × 90 × 250 mm" },
      { label: "Weight", value: "780 g" },
      { label: "Warranty", value: "12 months" },
    ],
    faqs: [
      { q: "Can I use the light without music?", a: "Yes. The light, speaker, clock and charger all work independently." },
      { q: "Does the alarm work without my phone?", a: "Yes. Once set, the alarm runs from the lamp itself." },
      shippingFaq,
    ],
    sku: "SK-GGL-10",
    price: 2499,
    compareAt: 2999,
    stock: 110,
    weightGrams: 780,
    photos: 2,
  },
  {
    vendor: "kinetic",
    category: "audio",
    slug: "pocket-speaker",
    name: "Ember Pocket Speaker",
    tagline: "A palm-sized wireless speaker with a warm ember glow.",
    description:
      "Small enough for a jacket pocket but loud enough for a room. The glowing core pulses gently with the music and makes it a pleasant thing to have on a desk or bedside table. Pair it with your phone or laptop in seconds.",
    highlights: [
      "Clear 5 W sound from a tiny body",
      "Ambient glow that moves with the music",
      "Bluetooth pairing with phones and laptops",
      "Rechargeable by USB-C",
    ],
    specs: [
      { label: "Output", value: "5 W" },
      { label: "Battery", value: "400 mAh, about 4 hours" },
      { label: "Connectivity", value: "Bluetooth" },
      { label: "Size", value: "70 × 70 × 85 mm" },
      { label: "Weight", value: "190 g" },
      { label: "Warranty", value: "6 months" },
    ],
    faqs: [
      { q: "Can I switch the light off?", a: "Yes. The glow can be turned off while the music keeps playing." },
      { q: "Can I take calls on it?", a: "It is designed for music and video sound. For calls we recommend using your phone." },
      shippingFaq,
    ],
    sku: "SK-EMB-11",
    price: 999,
    stock: 22,
    weightGrams: 190,
    photos: 2,
  },
  {
    vendor: "kinetic",
    category: "desk",
    slug: "voice-alarm-clock",
    name: "Astro Voice Alarm Clock",
    tagline: "A little astronaut that tells the time, answers questions and wakes you up.",
    description:
      "A voice-controlled alarm clock made for students. Ask it the time, set an alarm or a study timer by speaking, and use the built-in assistant for quick questions. The display glows softly in the dark so the time is always visible.",
    highlights: [
      "Set alarms and timers with your voice",
      "Built-in voice assistant for quick questions",
      "Glow-in-the-dark display",
      "Friendly astronaut design children enjoy",
    ],
    specs: [
      { label: "Control", value: "Voice and buttons" },
      { label: "Display", value: "LCD with night glow" },
      { label: "Connectivity", value: "Wi-Fi for the assistant" },
      { label: "Size", value: "95 × 90 × 140 mm" },
      { label: "Weight", value: "310 g" },
      { label: "Warranty", value: "12 months" },
    ],
    faqs: [
      { q: "Does it work without Wi-Fi?", a: "The clock, alarms and timers work without Wi-Fi. The voice assistant needs a connection." },
      { q: "Which languages does it understand?", a: "English is supported at launch. More languages are planned." },
      shippingFaq,
    ],
    sku: "SK-AST-12",
    price: 5499,
    stock: 45,
    weightGrams: 310,
    photos: 1,
  },
];

export const SEED_CUSTOMERS = [
  { email: "customer@curio.example", name: "Karthik Raman" },
  { email: "divya@curio.example", name: "Divya Subramanian" },
  { email: "arun@curio.example", name: "Arun Prakash" },
  { email: "meena@curio.example", name: "Meena Lakshmi" },
  { email: "vignesh@curio.example", name: "Vignesh Kumar" },
] as const;

export const SEED_ADMIN = { email: "admin@curio.example", name: "Store Owner" } as const;
