# Client walkthrough script

A 10 to 15 minute demo that follows one order from the customer, to the vendor, to the store owner.

## Before you start

1. Start the store: `npm run dev`, then open http://localhost:3000.
2. All demo accounts share one password. It is the value of `SEED_PASSWORD` in `.env.local`.
3. To put the demo data back to its starting state at any time, run `npm run db:reset`. This deletes everything in the database, including any orders placed during a demo, and loads the demo data again.
4. Use two browser windows (one normal, one private) so you can stay signed in as a customer and a vendor at the same time.

| Who | Sign in as | What they are |
|---|---|---|
| Customer | `customer@curio.example` | Karthik Raman, Anna Nagar, Chennai |
| Vendor 1 | `vendor.brightworks@curio.example` | Shenzhen Brightworks, China (lamps, power) |
| Vendor 2 | `vendor.looplabs@curio.example` | Loop Labs Hangzhou, China (desk gadgets) |
| Vendor 3 | `vendor.kinetic@curio.example` | Seoul Kinetic, South Korea (audio, clocks) |
| Store owner | `admin@curio.example` | Sees everything, across all vendors |

## What is already in the demo

12 products from 3 vendors and about three months of invented order history (roughly 350 orders from 25 Chennai customers), so the sales charts and forecast have something to show. The history grows steadily week by week and is regenerated relative to today every time the data is reset.

On top of that history are 8 named orders, one at every stage, which this script refers to:

| Placed | Customer (area) | Items | Where it stands |
|---|---|---|---|
| Today | Karthik Raman (Anna Nagar) | Fortune Floating Lamp | **New**, waiting for Brightworks |
| 1 day ago | Arun Prakash (T. Nagar) | Retro Pixel Desk Clock, 2 × Ember Pocket Speaker | **New** for Loop Labs and for Seoul Kinetic |
| 2 days ago | Divya Subramanian (Adyar) | 2 × Origami Touch Lamp | **Accepted** by Brightworks |
| 4 days ago | Vignesh Kumar (Sholinganallur) | Ranger Power Radio, Astro Voice Alarm Clock | Brightworks **packed**, Seoul Kinetic **accepted** |
| 7 days ago | Meena Lakshmi (Velachery) | Pixel Art Light Board, 2 × 3D Illusion Night Light | **Shipped** by Loop Labs |
| 12 days ago | Karthik Raman (Anna Nagar) | Glow Frame Charging Light, Mini Humidifier, Ember Pocket Speaker | Two parcels **delivered**, one **shipped** |
| 16 days ago | Arun Prakash (T. Nagar) | 2 × Clip Power Bank, Retro Pixel Desk Clock | **Delivered** |
| 21 days ago | Divya Subramanian (Adyar) | Fortune Floating Lamp, G-Glow Speaker Lamp | **Delivered** |

## Part 1: The customer buys (3 minutes)

1. **Home page.** Point out the curated range, categories and "ships from" on each product. No login is needed to browse.
2. **Open a product**, for example *G-Glow Speaker Lamp*. Show photos, highlights, specifications, questions and answers, and reviews marked "Verified purchase".
3. **Add to cart** without signing in. Add a second product from a different vendor, for example *Retro Pixel Desk Clock*.
4. **Cart.** Both items sit in one cart, even though they come from different vendors.
5. **Checkout.** The store now asks the customer to sign in. Sign in as the customer.
6. Enter a Chennai delivery address (or use the one below) and place the order. Payment is a placeholder: no real money moves.

   > Karthik Raman, Flat 3B, Shanthi Apartments, 27 4th Avenue, Anna Nagar, Chennai, Tamil Nadu 600040, phone 9840012345

7. **Order page.** One order number, two shipments, each with its own progress tracker.

**Say:** "One checkout for the customer. Behind the scenes the order is split, and each vendor only receives their own part."

## Part 2: The vendor receives and ships (4 minutes)

In the second browser window, sign in as `vendor.kinetic@curio.example`.

1. **Overview.** New orders needing action are counted at the top. Each vendor also has a few other new and in-progress orders from the background history.
2. **Orders.** The order you just placed is at the top with status **New**. Open it.
3. **What the vendor sees:** the items to pack, the customer's name, full delivery address and phone number, and that payment is confirmed. They do not see the other vendor's items.
4. **Accept** the order. Status changes to *Accepted*.
5. **Pack it.** Enter the package details: number of packages, weight, length, width and height. Try to mark it packed without them first, to show the store insists on these details.
6. **Ship it.** Enter the carrier and tracking number, then *Mark as shipped*.
7. **Mark as delivered** once it arrives (in the live system the tracking team's integration will do this automatically).
8. Each step is recorded with date and time under *History*.
9. **Sales trends** (back on Overview, lower down). The vendor sees their own sales for the last 7 and 30 days against the period before, a chart they can switch between daily, weekly and monthly, a 4-week forecast, their best sellers, and which products will run out of stock soonest. Ember Pocket Speaker is flagged to restock.
10. **Products.** Show how a vendor adds a product: name, description, photos, specifications, price and stock. It goes live immediately, no approval step.

Switch back to the customer window and refresh the order page: the tracker has moved, and the tracking number is shown.

**Ready-made examples** if you do not want to click through every step:
- Sign in as Brightworks and open Vignesh Kumar's order: already **packed**, package size filled in, ready for a tracking number.
- Sign in as Loop Labs and open Meena Lakshmi's order: already **shipped** with a tracking number.

## Part 3: Verified reviews (2 minutes)

1. As the customer, open *Bottle-Top Mini Humidifier*. Karthik's order of this product was delivered, so a review form is shown. Write a review and submit it. It appears with "Verified purchase".
2. Now open *Fortune Floating Lamp*. Karthik has ordered it but it has not been delivered, so the store explains that he can review it once it arrives.
3. Sign out and open any product: visitors are asked to sign in, and only buyers can review.

**Say:** "A review can only come from someone whose order of that exact product was delivered. One review per customer per product."

## Part 4: The store owner's view (4 minutes)

Sign in as `admin@curio.example`.

1. **Overview.** Total sales, number of orders, shipments pending, shipments delivered.
2. **Fulfilment pipeline.** How many shipments are new, accepted, packed, shipped and delivered. The "not yet accepted" count tells the owner which vendors to chase.
3. **Sales trends.** Sales for the last 7 and 30 days with the change against the period before. The chart switches between daily, weekly and monthly; hover over it to read any point.
4. **Forecast.** The dotted line and shaded band on the weekly chart, and the panel beside it, estimate the next 4 weeks from the recent trend. Be clear it is an estimate: it extends the last 12 weeks in a straight line and knows nothing about festivals or promotions. With under 4 weeks of sales it shows "not enough history" instead.
5. **Best sellers, weekly sales by vendor, fulfilment speed.** Which products earn the most, which vendors are growing, and how long each vendor takes to ship and deliver (Seoul Kinetic is the slowest in the demo).
6. **Sales by vendor.** All-time sales, shipments, pending and delivered for each vendor, plus totals by vendor country.
7. **Orders.** Every order with customer, city, vendors involved, total, payment and status. Open one to see each vendor's shipment, package details, tracking and the customer's address.
8. **Vendors.** One row per vendor with their sales and outstanding work.
9. **Products.** Everything that is live across all vendors.

**Say:** "The owner does not approve or touch orders. This is a monitoring view: who is selling, what is stuck, and how much has been made."

## What is a placeholder today

Be clear with the client that these are stand-ins until the other teams deliver their parts:

- **Payments:** a mock payment that always succeeds. No gateway is connected.
- **Shipping charges, customs and duties:** shown as zero.
- **Tracking:** the vendor types the carrier and tracking number by hand.
- **Returns and refunds, terms and conditions:** draft policy pages.
- **Notifications:** no emails or SMS are sent yet. Vendors see new orders in their portal.
- **Products and photos:** sample items and photos taken from public supplier listings, for demonstration only. They must be replaced with the vendors' own products and photos before the store goes public.
- **Customers, addresses and order history:** invented people, addresses and orders. The sales figures, trends and forecast in the demo are generated, not real.
