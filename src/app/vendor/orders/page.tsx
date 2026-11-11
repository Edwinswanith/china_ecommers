import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/shell";
import { VendorOrdersTable } from "@/components/dashboard/vendor-orders-table";
import { requireVendor } from "@/lib/auth/guards";
import { listVendorOrders } from "@/lib/data/vendor";
import type { FulfillmentStatus } from "@/lib/db/schema";
import { OPEN_STATUSES } from "@/lib/domain/fulfillment";

export const metadata: Metadata = { title: "Orders" };

const VIEWS: ReadonlyArray<{ key: string; label: string; statuses?: readonly FulfillmentStatus[] }> = [
  { key: "all", label: "All" },
  { key: "open", label: "Open", statuses: OPEN_STATUSES },
  { key: "shipped", label: "Shipped", statuses: ["shipped"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

interface PageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function VendorOrdersPage({ searchParams }: PageProps) {
  const { vendor } = await requireVendor();
  const { view } = await searchParams;
  const active = VIEWS.find((v) => v.key === view) ?? VIEWS[0];
  const rows = await listVendorOrders(vendor.id, active.statuses);
  return (
    <>
      <PageHeader eyebrow="Fulfilment" title="Orders" />
      <nav aria-label="Filter orders" className="mb-5 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={v.key === "all" ? "/vendor/orders" : `/vendor/orders?view=${v.key}`}
            aria-current={v.key === active.key ? "page" : undefined}
            className={`chip ${v.key === active.key ? "chip-active" : ""}`}
          >
            {v.label}
          </Link>
        ))}
      </nav>
      <VendorOrdersTable rows={rows} emptyText="No orders in this view." />
    </>
  );
}
