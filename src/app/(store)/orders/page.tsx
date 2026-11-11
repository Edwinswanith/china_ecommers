import { ChevronRight, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductImage } from "@/components/product-image";
import { OrderStatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth/guards";
import { listOrdersForCustomer } from "@/lib/data/orders";
import { rollupOrderStatus } from "@/lib/domain/fulfillment";
import { formatMoney } from "@/lib/domain/money";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "My orders", robots: { index: false, follow: false } };

export default async function OrdersPage() {
  const session = await requireUser("/orders");
  const orders = await listOrdersForCustomer(session.userId);
  return (
    <div className="shell max-w-4xl py-8 md:py-10">
      <h1 className="display text-3xl md:text-4xl">My orders</h1>
      <p className="mb-6 mt-1.5 text-[15px] text-subtle">Track your deliveries and review what you have received.</p>
      {orders.length === 0 ? (
        <div className="rounded-3xl bg-muted px-6 py-16 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white text-subtle shadow-sm"><Package size={26} aria-hidden="true" /></span>
          <p className="mt-5 text-xl font-semibold tracking-tight">You have no orders yet</p>
          <p className="mt-1.5 text-subtle">When you place an order, you can track it here.</p>
          <Link href="/products" className="btn btn-primary btn-lg mt-7">Start shopping</Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/orders/${order.id}`} className="lift group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 sm:p-5">
                {/* Phones show one photo with a count; wider screens show up to three. */}
                <div className="relative flex shrink-0 -space-x-3">
                  {order.items.slice(0, 3).map((item, index) => (
                    <div key={item.id} className={`w-14 overflow-hidden rounded-xl border-2 border-white shadow-sm ${index > 0 ? "hidden sm:block" : ""}`}><ProductImage src={item.image} alt="" sizes="56px" /></div>
                  ))}
                  {order.items.length > 1 ? <span className="num absolute -bottom-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-fg px-1 text-[11px] font-bold text-white sm:hidden">+{order.items.length - 1}</span> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="num text-[15.5px] font-semibold">{order.number}</span>
                    <OrderStatusBadge status={rollupOrderStatus(order.vendorOrders.map((v) => v.status))} />
                  </div>
                  <p className="mt-1 truncate text-[14.5px] text-subtle">{order.items.map((i) => i.name).join(", ")}</p>
                  <p className="mt-0.5 text-[13px] text-subtle">
                    {formatDate(order.createdAt)} · {order.vendorOrders.length} {order.vendorOrders.length === 1 ? "delivery" : "deliveries"}
                  </p>
                  <p className="num mt-1.5 text-[16px] font-bold sm:hidden">{formatMoney(order.totalMinor, order.currency)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="num hidden text-[17px] font-bold sm:inline">{formatMoney(order.totalMinor, order.currency)}</span>
                  <ChevronRight size={18} className="text-subtle transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
