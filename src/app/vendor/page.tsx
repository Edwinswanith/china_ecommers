import { Boxes, IndianRupee, Inbox, PackageOpen, Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader, StatTile } from "@/components/dashboard/shell";
import { VendorOrdersTable } from "@/components/dashboard/vendor-orders-table";
import { requireVendor } from "@/lib/auth/guards";
import { getVendorStats, listVendorOrders } from "@/lib/data/vendor";
import { OPEN_STATUSES } from "@/lib/domain/fulfillment";
import { formatMoney } from "@/lib/domain/money";

export default async function VendorOverviewPage() {
  const { vendor } = await requireVendor();
  const [stats, openOrders] = await Promise.all([getVendorStats(vendor.id), listVendorOrders(vendor.id, OPEN_STATUSES)]);
  const open = stats.byStatus.new + stats.byStatus.accepted + stats.byStatus.packed;
  return (
    <>
      <PageHeader eyebrow={vendor.name} title="Overview" action={<Link href="/vendor/products/new" className="btn btn-primary"><Plus size={17} aria-hidden="true" /> Add product</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Inbox} label="New orders" value={String(stats.byStatus.new)} note="Waiting for you to accept" tone={stats.byStatus.new > 0 ? "signal" : "default"} href="/vendor/orders?view=open" />
        <StatTile icon={PackageOpen} label="To pack and ship" value={String(stats.byStatus.accepted + stats.byStatus.packed)} note={`${stats.byStatus.shipped} in transit`} href="/vendor/orders?view=open" />
        <StatTile icon={IndianRupee} label="Sales" value={formatMoney(stats.revenueMinor, "INR")} note={`${stats.byStatus.delivered} delivered`} tone="dark" />
        <StatTile icon={Boxes} label="Live products" value={String(stats.productCount)} note={stats.lowStockCount > 0 ? `${stats.lowStockCount} low on stock` : "Stock levels healthy"} href="/vendor/products" />
      </div>
      <section className="mt-10" aria-labelledby="open-heading">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="open-heading" className="text-[18px] font-bold tracking-tight">Needs your action ({open})</h2>
          <Link href="/vendor/orders" className="link text-[14px]">View all orders</Link>
        </div>
        <VendorOrdersTable rows={openOrders} emptyText="You are all caught up. New orders will appear here the moment a customer buys." />
      </section>
    </>
  );
}
