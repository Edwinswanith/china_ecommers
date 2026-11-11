import { Boxes, IndianRupee, Inbox, PackageOpen, Plus } from "lucide-react";
import Link from "next/link";
import { SalesAnalytics } from "@/components/dashboard/sales-analytics";
import { PageHeader, StatTile } from "@/components/dashboard/shell";
import { StockRunwayPanel } from "@/components/dashboard/stock-runway";
import { VendorOrdersTable } from "@/components/dashboard/vendor-orders-table";
import { requireVendor } from "@/lib/auth/guards";
import { getSalesHistory, getStockRunway, getTopProducts } from "@/lib/data/analytics";
import { getVendorStats, listVendorOrders } from "@/lib/data/vendor";
import { parseTrendView } from "@/lib/domain/analytics";
import { OPEN_STATUSES } from "@/lib/domain/fulfillment";
import { formatMoney } from "@/lib/domain/money";

const OPEN_ORDERS_SHOWN = 8;

interface VendorOverviewPageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function VendorOverviewPage({ searchParams }: VendorOverviewPageProps) {
  const { vendor } = await requireVendor();
  const view = parseTrendView((await searchParams).view);
  const scope = { vendorId: vendor.id };
  const [stats, openOrders, history, topProducts, runway] = await Promise.all([
    getVendorStats(vendor.id),
    listVendorOrders(vendor.id, OPEN_STATUSES),
    getSalesHistory(scope),
    getTopProducts(scope),
    getStockRunway(vendor.id),
  ]);
  const open = stats.byStatus.new + stats.byStatus.accepted + stats.byStatus.packed;
  return (
    <>
      <PageHeader eyebrow={vendor.name} title="Overview" action={<Link href="/vendor/products/new" className="btn btn-primary"><Plus size={17} aria-hidden="true" /> Add product</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Inbox} label="New orders" value={String(stats.byStatus.new)} count={{ value: stats.byStatus.new, format: "count" }} note="Waiting for you to accept" tone={stats.byStatus.new > 0 ? "signal" : "default"} href="/vendor/orders?view=open" />
        <StatTile icon={PackageOpen} label="To pack and ship" value={String(stats.byStatus.accepted + stats.byStatus.packed)} count={{ value: stats.byStatus.accepted + stats.byStatus.packed, format: "count" }} note={`${stats.byStatus.shipped} in transit`} href="/vendor/orders?view=open" />
        <StatTile icon={IndianRupee} label="Sales" value={formatMoney(stats.revenueMinor, "INR")} count={{ value: stats.revenueMinor, format: "money" }} note={`${stats.byStatus.delivered} delivered`} tone="dark" />
        <StatTile icon={Boxes} label="Live products" value={String(stats.productCount)} count={{ value: stats.productCount, format: "count" }} note={stats.lowStockCount > 0 ? `${stats.lowStockCount} low on stock` : "Stock levels healthy"} href="/vendor/products" />
      </div>
      <section className="mt-10" aria-labelledby="open-heading">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="open-heading" className="text-[18px] font-bold tracking-tight">Needs your action ({open})</h2>
          <Link href="/vendor/orders" className="link text-[14px]">View all orders</Link>
        </div>
        <VendorOrdersTable rows={openOrders.slice(0, OPEN_ORDERS_SHOWN)} emptyText="You are all caught up. New orders will appear here the moment a customer buys." />
      </section>

      <SalesAnalytics basePath="/vendor" view={view} history={history} topProducts={topProducts} ordersLabel="Shipments" />
      <div className="mt-4">
        <StockRunwayPanel rows={runway} />
      </div>
    </>
  );
}
