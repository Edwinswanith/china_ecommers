import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/dashboard/shell";
import { AddressBlock, TotalsBlock } from "@/components/order-summary";
import { ShipmentCard } from "@/components/shipment-card";
import { OrderStatusBadge } from "@/components/status-badge";
import { getOrderForAdmin } from "@/lib/data/admin";
import { rollupOrderStatus } from "@/lib/domain/fulfillment";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Order" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const order = await getOrderForAdmin(id);
  if (!order) notFound();
  return (
    <>
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-[14px] font-medium text-subtle transition-colors hover:text-fg">← Orders</Link>
      <div className="mt-3">
        <PageHeader
          eyebrow={`Placed ${formatDateTime(order.createdAt)}`}
          title={`Order ${order.number}`}
          action={<OrderStatusBadge status={rollupOrderStatus(order.vendorOrders.map((v) => v.status))} />}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.9fr_1fr]">
        <div className="space-y-6">
          {order.vendorOrders.map((shipment, index) => (
            <ShipmentCard key={shipment.id} index={index} total={order.vendorOrders.length} currency={order.currency} shipment={shipment} />
          ))}
        </div>
        <aside className="space-y-6">
          <div className="panel p-5">
            <h2 className="mb-3 text-[14px] font-semibold">Customer</h2>
            <p className="font-medium">{order.customer.name}</p>
            <p className="text-[14px] text-subtle">{order.customer.email}</p>
          </div>
          <div className="panel p-5">
            <h2 className="mb-3 text-[14px] font-semibold">Delivering to</h2>
            <AddressBlock order={order} />
          </div>
          <div className="panel p-5">
            <h2 className="mb-3 text-[14px] font-semibold">Payment summary</h2>
            <TotalsBlock order={order} />
          </div>
        </aside>
      </div>
    </>
  );
}
