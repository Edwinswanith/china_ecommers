import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/dashboard/shell";
import { ShipmentForm } from "@/components/dashboard/shipment-form";
import { AddressBlock } from "@/components/order-summary";
import { ProductImage } from "@/components/product-image";
import { ShipmentProgress } from "@/components/shipment-progress";
import { FulfillmentBadge } from "@/components/status-badge";
import { ChangeFlash } from "@/components/ui/change-flash";
import { requireVendor } from "@/lib/auth/guards";
import { getVendorOrder } from "@/lib/data/vendor";
import { FULFILLMENT_LABELS } from "@/lib/domain/fulfillment";
import { formatMoney } from "@/lib/domain/money";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Order" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VendorOrderPage({ params }: PageProps) {
  const { vendor } = await requireVendor();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const shipment = await getVendorOrder(id, vendor.id);
  if (!shipment) notFound();
  const units = shipment.items.reduce((sum, item) => sum + item.quantity, 0);
  const events = [...shipment.events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <>
      <Link href="/vendor/orders" className="inline-flex items-center gap-1 text-[14px] font-medium text-subtle transition-colors hover:text-fg">← Orders</Link>
      <div className="mt-3">
        <PageHeader eyebrow={`Placed ${formatDateTime(shipment.order.createdAt)}`} title={`Order ${shipment.order.number}`} action={<ChangeFlash watch={shipment.status}><FulfillmentBadge status={shipment.status} /></ChangeFlash>} />
      </div>
      {shipment.status === "cancelled" ? null : (
        <div className="panel mb-6 px-3 py-5 sm:px-5">
          <ShipmentProgress status={shipment.status} />
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          <section className="panel" aria-labelledby="items-heading">
            <h2 id="items-heading" className="border-b border-line px-5 py-3.5 text-[15px] font-semibold">Items to pack · {units} {units === 1 ? "unit" : "units"}</h2>
            <ul className="divide-y divide-line px-5">
              {shipment.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-4">
                  <div className="w-14 shrink-0 overflow-hidden rounded-lg"><ProductImage src={item.image} alt="" sizes="56px" /></div>
                  <p className="flex-1 font-medium">{item.name}</p>
                  <p className="num rounded-lg bg-muted px-2.5 py-1 text-[14px] font-bold">Qty {item.quantity}</p>
                  <p className="num w-24 text-right">{formatMoney(item.unitPriceMinor * item.quantity, shipment.order.currency)}</p>
                </li>
              ))}
            </ul>
            <p className="flex justify-between border-t border-line px-5 py-3 font-semibold">
              <span>Your total</span>
              <span className="num">{formatMoney(shipment.subtotalMinor, shipment.order.currency)}</span>
            </p>
          </section>
          <ShipmentForm key={`${shipment.status}-${shipment.updatedAt.getTime()}`} shipment={shipment} />
        </div>
        <aside className="space-y-6">
          <section className="panel p-5" aria-labelledby="ship-to-heading">
            <h2 id="ship-to-heading" className="mb-3 text-[14px] font-semibold">Ship to</h2>
            <AddressBlock order={shipment.order} />
            <p className="label mt-4 text-subtle">Payment: {shipment.order.paymentStatus}</p>
          </section>
          <section className="panel p-5" aria-labelledby="history-heading">
            <h2 id="history-heading" className="mb-3 text-[14px] font-semibold">History</h2>
            <ol className="space-y-2.5">
              {events.map((event) => (
                <li key={event.id} className="animate-fade flex gap-3 text-[14px]">
                  <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                  <span>
                    <span className="font-medium">{event.status === "new" ? "Order received" : FULFILLMENT_LABELS[event.status]}</span>
                    <span className="num block text-[12.5px] text-subtle">{formatDateTime(event.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </>
  );
}
