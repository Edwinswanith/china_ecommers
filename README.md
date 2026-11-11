# Curio Supply — multi-vendor store (China → India)

A curated marketplace for inventive electronics. Vendors in any of 24 countries list their own products; customers in India buy them; each order is split per vendor and fulfilled by that vendor; the store owner monitors everything from an admin panel.

"Curio Supply" is a working title. Change it in `src/lib/config/brand.ts`.

## Run it

The store keeps all its data in MongoDB (for example a free MongoDB Atlas cluster).

1. Copy `.env.example` to `.env.local` and fill it in: `MONGODB_URI` (your connection string), `MONGODB_DB`, `SESSION_SECRET` and `SEED_PASSWORD`.
2. Install, load the demo data once, and start:

```bash
npm install
npm run db:seed
npm run dev
```

Indexes are created automatically on first connection. In Atlas, allow your IP address under Network Access, or the connection will time out.

Demo accounts (password is `SEED_PASSWORD` in `.env.local`):

| Role | Email |
| --- | --- |
| Admin | `admin@curio.example` |
| Vendor (Shenzhen) | `vendor.brightworks@curio.example` |
| Vendor (Hangzhou) | `vendor.looplabs@curio.example` |
| Vendor (Seoul) | `vendor.kinetic@curio.example` |
| Customer | `customer@curio.example` |

The demo data is 12 sample products, about three months of generated order history (so the sales charts and forecast have something to show) and 8 named orders at different stages. A step-by-step script for showing it to a client is in [docs/DEMO-WALKTHROUGH.md](docs/DEMO-WALKTHROUGH.md).

> **Demo photos:** the images in `public/demo/` come from public supplier listings and are for private demonstration only. Do not use them on a public site; replace them with the vendors' own photos before any public launch.

Other commands: `npm test` (unit tests), `npm run build`, `npm run db:reset` (delete everything in the configured MongoDB database and load the demo data again).

## How it works

**Customers** browse and fill a cart without an account (the cart lives in the browser). Sign-in is required only at checkout. After delivery they can review what they bought.

**Vendors** register at `/sell` and get a portal at `/vendor`. Products they publish go live immediately. Each order arrives with the customer's name, phone and delivery address. The vendor moves it through `new → accepted → packed → shipped → delivered`, and must enter package count, weight and dimensions before it can be marked packed.

**Admin** (`/admin`) sees gross sales, sales per vendor and per vendor country, the fulfilment pipeline, every order and its shipments, and can suspend a vendor or take down a product. Admin does not approve listings.

### Rules enforced in code

- **Order splitting.** A cart with items from several vendors becomes one order with one shipment (a `vendor_orders` document) per vendor. `src/lib/domain/cart.ts`
- **Prices are server-side.** The browser sends only product ids and quantities; prices and stock are read from the database at checkout. Stock is decremented with a guarded update so the last unit cannot be sold twice. `src/lib/db/order-writer.ts`
- **Verified reviews.** A review requires a paid, delivered purchase of that product, one review per customer per product (also a unique index). `src/lib/domain/reviews.ts`
- **Sales trends and forecast.** Both dashboards chart sales by day, week and month and project the next 4 weeks with a straight-line trend and a likely range; under 4 weeks of sales it declines to forecast. The calculations are pure functions in `src/lib/domain/analytics.ts`, the queries in `src/lib/data/analytics.ts`.
- **Vendor isolation.** Every vendor query and update is scoped by the signed-in vendor's id.

## Placeholders (owned by other teams)

| Area | Where | What to do |
| --- | --- | --- |
| Payment gateway | `src/lib/payments.ts` | Implement `charge()` against the real gateway and set `PAYMENTS_ARE_LIVE`. Orders are currently marked paid without charging. |
| Shipping cost and customs duty | `buildOrderDraft` in `src/lib/domain/cart.ts` | `shippingMinor` and `dutiesMinor` are `0`. Orders already store both. |
| Carrier tracking | `vendor_orders.carrier`, `tracking_number` | Vendors type these in by hand; "delivered" is set by the vendor. Replace with carrier webhooks. |
| Returns, terms, privacy, shipping copy | `src/lib/config/policies.ts` | Replace the draft text. Pages show a "Draft" tag until `placeholder` is set to `false`. |
| Notifications | — | Not built. Vendors see new orders in their portal. The hook point is after `insertOrder` in `src/lib/actions/checkout.ts`. |

## SEO, GEO and AEO

- Every storefront page is server-rendered with a unique title, description and canonical URL.
- JSON-LD on every page type: `Organization`, `WebSite` (with search action), `Product` with `Offer`, `AggregateRating` and `Review`, `BreadcrumbList`, `FAQPage`, `ItemList`. `src/lib/seo/structured-data.ts`
- `/sitemap.xml` is generated from live products; `/robots.txt` blocks private areas and explicitly allows AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended and others).
- `/llms.txt` is a live plain-text summary of the catalogue with prices, stock and ratings for AI assistants.
- Product pages are written answer-first: what it is, key facts, a specification table and per-product Q&A that vendors fill in.

Set `SITE_URL` to the real domain before launch; canonical URLs and structured data are built from it. On Vercel it defaults to the project's own address if you leave it out.

## Structure

```
src/app/(store)/     storefront: home, catalogue, product, cart, checkout, orders, auth
src/app/vendor/      vendor portal
src/app/admin/       admin panel
src/lib/domain/      pure business rules, unit tested (money, cart split, fulfilment, reviews)
src/lib/db/          record shapes, MongoDB connection and indexes, order writer, seed
src/lib/data/        read queries per area
src/lib/actions/     server actions (all writes)
src/lib/config/      brand, markets and currencies, policies, FAQs
```

## Deploying to Vercel

1. Import the GitHub repository in Vercel.
2. Under Settings → Environment Variables add `MONGODB_URI`, `MONGODB_DB` and `SESSION_SECRET`. `SITE_URL` is optional: add it only when you connect your own domain.
3. In MongoDB Atlas → Network Access, allow access from anywhere (`0.0.0.0/0`). Vercel does not use fixed IP addresses.
4. Deploy. The site reads the same database you seeded with `npm run db:seed`.

## Going to production

1. Create a separate MongoDB database for production and set `MONGODB_URI` and `MONGODB_DB`. It must be a replica set (every Atlas cluster is): checkout, reviews and shipment updates use transactions.
2. Set a fresh `SESSION_SECRET` (`openssl rand -hex 32`) and `SITE_URL`.
3. Uploaded product photos are stored in the `media` collection (4 MB limit each), which is fine to start with. For a large catalogue, reimplement the two functions in `src/lib/storage.ts` against S3 or R2.
4. Replace the in-memory rate limiter in `src/lib/rate-limit.ts` with a shared store if running more than one instance.
5. Create the admin account directly in the database; there is no public admin sign-up.

## Adding another market

Markets and currencies are configuration (`src/lib/config/markets.ts`). Orders already record `market_country` and `currency`, and money is stored in minor units. Selling in a second country needs a new market entry, prices in that currency, and that country's address form.
