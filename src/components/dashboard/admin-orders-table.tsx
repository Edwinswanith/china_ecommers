import Link from "next/link";
import { OrderStatusBadge } from "@/components/status-badge";
import type { listAllOrders } from "@/lib/data/admin";
import { rollupOrderStatus } from "@/lib/domain/fulfillment";
import { formatMoney } from "@/lib/domain/money";
import { formatDate } from "@/lib/format";

type Rows = Awaited<ReturnType<typeof listAllOrders>>;

export function AdminOrdersTable({ rows }: { rows: Rows }) {
  if (rows.length === 0) return <p className="rounded-2xl border border-line bg-white p-10 text-center text-subtle">No orders match this view.</p>;
  return (
    <div className="panel overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Placed</th>
            <th>Customer</th>
            <th>Vendors</th>
            <th className="text-right">Units</th>
            <th className="text-right">Total</th>
            <th>Payment</th>
            <th>Status</th>
            <th><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((order) => (
            <tr key={order.id}>
              <td className="num whitespace-nowrap font-semibold">{order.number}</td>
              <td className="whitespace-nowrap text-subtle">{formatDate(order.createdAt)}</td>
              <td>
                {order.customer.name}
                <span className="block text-[12.5px] text-subtle">{order.shippingAddress.city}</span>
              </td>
              <td className="max-w-[16rem] text-[13.5px]">{order.vendorOrders.map((v) => v.vendor.name).join(", ")}</td>
              <td className="num text-right">{order.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
              <td className="num text-right font-semibold">{formatMoney(order.totalMinor, order.currency)}</td>
              <td className="capitalize text-subtle">{order.paymentStatus}</td>
              <td><OrderStatusBadge status={rollupOrderStatus(order.vendorOrders.map((v) => v.status))} /></td>
              <td className="text-right"><Link href={`/admin/orders/${order.id}`} className="btn btn-ghost btn-sm">Open</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
