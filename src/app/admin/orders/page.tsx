import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import Link from "next/link";
import { AdminOrdersTable } from "@/components/dashboard/admin-orders-table";
import { PageHeader } from "@/components/dashboard/shell";
import { listAllOrders } from "@/lib/data/admin";
import { rollupOrderStatus, type OrderStatus } from "@/lib/domain/fulfillment";

export const metadata: Metadata = { title: "Orders" };

const VIEWS: ReadonlyArray<{ key: string; label: string; statuses?: readonly OrderStatus[] }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending", statuses: ["processing", "partially_shipped"] },
  { key: "shipped", label: "In transit", statuses: ["shipped"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

interface PageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { view } = await searchParams;
  const active = VIEWS.find((v) => v.key === view) ?? VIEWS[0];
  const all = await listAllOrders();
  const statusOf = (order: (typeof all)[number]): OrderStatus => rollupOrderStatus(order.vendorOrders.map((v) => v.status));
  const rows = active.statuses ? all.filter((order) => active.statuses?.includes(statusOf(order))) : all;
  return (
    <>
      <PageHeader eyebrow="Every vendor" title="Orders" />
      <nav aria-label="Filter orders" className="mb-5 flex flex-wrap gap-2">
        {VIEWS.map((v) => {
          const count = v.statuses ? all.filter((order) => v.statuses?.includes(statusOf(order))).length : all.length;
          return (
            <Link
              key={v.key}
              href={v.key === "all" ? "/admin/orders" : `/admin/orders?view=${v.key}`}
              aria-current={v.key === active.key ? "page" : undefined}
              className={`chip ${v.key === active.key ? "chip-active" : ""}`}
            >
              {v.label} · {count}
            </Link>
          );
        })}
      </nav>
      <AdminOrdersTable rows={rows} />
    </>
  );
}
