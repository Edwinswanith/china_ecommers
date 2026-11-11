import { requireAdmin } from "@/lib/auth/guards";
import { CircleCheckBig, Hourglass, IndianRupee, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { FulfilmentSpeedPanel, VendorTrendPanel } from "@/components/dashboard/admin-analytics";
import { AdminOrdersTable } from "@/components/dashboard/admin-orders-table";
import { SalesAnalytics } from "@/components/dashboard/sales-analytics";
import { PageHeader, StatTile } from "@/components/dashboard/shell";
import { countryName } from "@/lib/config/markets";
import { getFulfilmentSpeed, getSalesHistory, getTopProducts, getVendorSalesHistory } from "@/lib/data/analytics";
import { getAdminOverview, listAllOrders, listVendorSales, salesByCountry } from "@/lib/data/admin";
import { getAdminScope } from "@/lib/data/admin-scope";
import type { FulfillmentStatus } from "@/lib/db/schema";
import { parseTrendView } from "@/lib/domain/analytics";
import { FULFILLMENT_LABELS } from "@/lib/domain/fulfillment";
import { formatMoney } from "@/lib/domain/money";

const PIPELINE: ReadonlyArray<{ status: FulfillmentStatus; className: string }> = [
  { status: "new", className: "bg-amber-400 text-amber-950" },
  { status: "accepted", className: "bg-sky-300 text-sky-950" },
  { status: "packed", className: "bg-brand text-white" },
  { status: "shipped", className: "bg-indigo-500 text-white" },
  { status: "delivered", className: "bg-ok text-white" },
];

const VENDOR_TREND_DAYS = 84;

interface AdminOverviewPageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function AdminOverviewPage({ searchParams }: AdminOverviewPageProps) {
  await requireAdmin();
  const view = parseTrendView((await searchParams).view);
  const { resolved, label } = await getAdminScope();
  const [overview, vendorSales, recentOrders, history, topProducts, vendorTrend, speed] = await Promise.all([
    getAdminOverview(resolved),
    listVendorSales(resolved),
    listAllOrders(6, resolved),
    getSalesHistory(resolved),
    getTopProducts(resolved),
    getVendorSalesHistory(VENDOR_TREND_DAYS, resolved),
    getFulfilmentSpeed(resolved),
  ]);
  const countries = salesByCountry(vendorSales);
  const pending = overview.shipments.new + overview.shipments.accepted + overview.shipments.packed;
  const liveShipments = PIPELINE.reduce((sum, p) => sum + overview.shipments[p.status], 0);
  const topRevenue = Math.max(1, ...vendorSales.map((v) => v.revenueMinor));

  return (
    <>
      <PageHeader eyebrow={label} title="Overview" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={IndianRupee} label="Total sales" value={formatMoney(overview.grossSalesMinor, "INR")} count={{ value: overview.grossSalesMinor, format: "money" }} note={`Average order ${formatMoney(overview.averageOrderMinor, "INR")}`} tone="dark" />
        <StatTile icon={ShoppingCart} label="Orders placed" value={String(overview.orderCount)} count={{ value: overview.orderCount, format: "count" }} note={`${overview.customerCount} customers`} href="/admin/orders" />
        <StatTile icon={Hourglass} label="Shipments pending" value={String(pending)} count={{ value: pending, format: "count" }} note={`${overview.shipments.new} not yet accepted by the vendor`} tone={pending > 0 ? "signal" : "default"} href="/admin/orders?view=pending" />
        <StatTile icon={CircleCheckBig} label="Delivered shipments" value={String(overview.shipments.delivered)} count={{ value: overview.shipments.delivered, format: "count" }} note={`${overview.shipments.shipped} in transit`} />
      </div>

      <section className="panel mt-6 p-5" aria-labelledby="pipeline-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="pipeline-heading" className="text-[18px] font-bold tracking-tight">Fulfilment pipeline</h2>
          <p className="label text-subtle">{liveShipments} shipments · {overview.shipments.cancelled} cancelled</p>
        </div>
        {liveShipments === 0 ? (
          <p className="mt-4 text-subtle">No shipments yet.</p>
        ) : (
          <>
            <div className="mt-4 flex h-11 gap-1" role="img" aria-label={PIPELINE.map((p) => `${overview.shipments[p.status]} ${FULFILLMENT_LABELS[p.status]}`).join(", ")}>
              {PIPELINE.filter((p) => overview.shipments[p.status] > 0).map((p) => (
                <div key={p.status} className={`num grid place-items-center rounded-lg text-[14px] font-bold ${p.className}`} style={{ flexGrow: overview.shipments[p.status], flexBasis: 0, minWidth: 34 }}>
                  {overview.shipments[p.status]}
                </div>
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-subtle">
              {PIPELINE.map((p) => (
                <li key={p.status} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${p.className}`} aria-hidden="true" />
                  {FULFILLMENT_LABELS[p.status]} · {overview.shipments[p.status]}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <SalesAnalytics basePath="/admin" view={view} history={history} topProducts={topProducts} ordersLabel="Orders" />

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <VendorTrendPanel vendors={vendorTrend} endDay={history.endDay} />
        <FulfilmentSpeedPanel rows={speed} />
      </div>

      <h2 className="mt-10 text-[18px] font-bold tracking-tight">All-time totals</h2>
      <div className="mt-4 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="panel" aria-labelledby="vendor-sales-heading">
          <div className="flex items-baseline justify-between border-b border-line px-5 py-4">
            <h2 id="vendor-sales-heading" className="text-[18px] font-bold tracking-tight">Sales by vendor</h2>
            <Link href="/admin/vendors" className="link text-[14px]">All {overview.vendorCount} vendors</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th className="w-[34%]">Sales</th>
                  <th className="text-right">Shipments</th>
                  <th className="text-right">Pending</th>
                  <th className="text-right">Delivered</th>
                </tr>
              </thead>
              <tbody>
                {vendorSales.slice(0, 8).map((vendor) => (
                  <tr key={vendor.id}>
                    <td>
                      <span className="font-medium">{vendor.name}</span>
                      <span className="block text-[12.5px] text-subtle">{vendor.city}, {countryName(vendor.countryCode)}</span>
                    </td>
                    <td>
                      <span className="num block text-[13.5px] font-semibold">{formatMoney(vendor.revenueMinor, "INR")}</span>
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                        <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.round((vendor.revenueMinor / topRevenue) * 100)}%` }} />
                      </span>
                    </td>
                    <td className="num text-right">{vendor.shipmentCount}</td>
                    <td className={`num text-right ${vendor.pendingCount > 0 ? "font-bold text-amber-700" : ""}`}>{vendor.pendingCount}</td>
                    <td className="num text-right">{vendor.deliveredCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel" aria-labelledby="country-heading">
          <h2 id="country-heading" className="border-b border-line px-5 py-4 text-[18px] font-bold tracking-tight">By vendor country</h2>
          <ul className="divide-y divide-line">
            {countries.map((country) => (
              <li key={country.countryCode} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <span>
                  <span className="font-medium">{countryName(country.countryCode)}</span>
                  <span className="block text-[12.5px] text-subtle">{country.vendorCount} {country.vendorCount === 1 ? "vendor" : "vendors"}</span>
                </span>
                <span className="num font-semibold">{formatMoney(country.revenueMinor, "INR")}</span>
              </li>
            ))}
          </ul>
          <p className="label border-t border-line px-5 py-3 text-subtle">{overview.productCount} live {overview.productCount === 1 ? "product" : "products"}{resolved.vendorIds ? " from these vendors" : " on the store"}</p>
        </section>
      </div>

      <section className="mt-6" aria-labelledby="recent-heading">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="recent-heading" className="text-[18px] font-bold tracking-tight">Latest orders</h2>
          <Link href="/admin/orders" className="link text-[14px]">All orders</Link>
        </div>
        <AdminOrdersTable rows={recentOrders} />
      </section>
    </>
  );
}
