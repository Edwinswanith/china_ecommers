import { ChevronLeft, MapPin, ReceiptText, Star } from "lucide-react";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CheckoutSteps } from "@/components/checkout-steps";
import { AddressBlock, TotalsBlock } from "@/components/order-summary";
import { ShipmentCard } from "@/components/shipment-card";
import { OrderStatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth/guards";
import { getOrderForCustomer } from "@/lib/data/orders";
import { rollupOrderStatus } from "@/lib/domain/fulfillment";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Order details", robots: { index: false, follow: false } };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}

export default async function OrderPage({ params, searchParams }: PageProps) {
  const [{ id }, { placed }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const session = await requireUser(`/orders/${id}`);
  const order = await getOrderForCustomer(id, session.userId);
  if (!order) notFound();
  const status = rollupOrderStatus(order.vendorOrders.map((v) => v.status));
  const delivered = order.vendorOrders.filter((v) => v.status === "delivered");

  return (
    <div className="shell py-8 md:py-10">
      {placed ? (
        <>
          <CheckoutSteps current={3} />
          <div className="animate-rise mb-8 mt-6 flex flex-col gap-4 rounded-3xl bg-ok-soft p-6 sm:flex-row sm:items-center md:p-8" role="status">
            <span className="pop-in grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ok text-white">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path className="draw-in" pathLength={1} d="M5 12.5l4.5 4.5L19 7.5" style={{ "--draw-time": "0.45s", "--draw-delay": "0.45s" } as CSSProperties} />
              </svg>
            </span>
            <div>
              <p className="display text-2xl md:text-3xl">Thank you, {session.name.split(" ")[0]}. Your order is placed.</p>
              <p className="mt-1.5 max-w-2xl text-[15.5px] text-subtle">
                We have sent it to {order.vendorOrders.length === 1 ? "the seller" : `${order.vendorOrders.length} sellers`}. You can follow each delivery on this page.
              </p>
            </div>
          </div>
        </>
      ) : null}

      <Link href="/orders" className="inline-flex items-center gap-1 text-[14px] font-medium text-subtle transition-colors hover:text-fg"><ChevronLeft size={16} aria-hidden="true" /> All orders</Link>
      <div className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display text-2xl md:text-3xl">Order <span className="num">{order.number}</span></h1>
          <p className="mt-1 text-[14.5px] text-subtle">Placed on {formatDate(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={status} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.9fr_1fr]">
        <div className="space-y-6">
          {order.vendorOrders.map((shipment, index) => (
            <ShipmentCard key={shipment.id} index={index} total={order.vendorOrders.length} currency={order.currency} shipment={shipment} />
          ))}
          {delivered.length > 0 ? (
            <div className="rounded-2xl bg-brand-soft p-5">
              <p className="flex items-center gap-2 text-[16px] font-semibold tracking-tight"><Star size={18} className="fill-star text-star" aria-hidden="true" /> How was your order?</p>
              <p className="mt-1 text-[14.5px] text-subtle">Your delivered items can now be reviewed. Honest reviews help other shoppers.</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {delivered.flatMap((v) => v.items).map((item) => (
                  <li key={item.id}>
                    <Link href={`/products/${item.product.slug}#reviews`} className="btn btn-ghost btn-sm">Review {item.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <aside className="space-y-6">
          <div className="panel p-5">
            <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold"><MapPin size={16} className="text-subtle" aria-hidden="true" /> Delivery address</h2>
            <AddressBlock order={order} />
          </div>
          <div className="panel p-5">
            <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold"><ReceiptText size={16} className="text-subtle" aria-hidden="true" /> Payment summary</h2>
            <TotalsBlock order={order} />
          </div>
        </aside>
      </div>
    </div>
  );
}
