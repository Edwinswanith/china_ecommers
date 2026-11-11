import Link from "next/link";
import { FulfillmentBadge } from "@/components/status-badge";
import type { listVendorOrders } from "@/lib/data/vendor";
import { formatMoney } from "@/lib/domain/money";
import { formatDate } from "@/lib/format";

type Rows = Awaited<ReturnType<typeof listVendorOrders>>;

export function VendorOrdersTable({ rows, emptyText }: { rows: Rows; emptyText: string }) {
  if (rows.length === 0) return <p className="rounded-2xl border border-line bg-white p-10 text-center text-subtle">{emptyText}</p>;
  return (
    <div className="panel overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Placed</th>
            <th>Items</th>
            <th>Ship to</th>
            <th className="text-right">Value</th>
            <th>Status</th>
            <th><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="num whitespace-nowrap font-semibold">{row.order.number}</td>
              <td className="whitespace-nowrap text-subtle">{formatDate(row.order.createdAt)}</td>
              <td className="max-w-xs">{row.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}</td>
              <td className="whitespace-nowrap">{row.order.shippingAddress.city}, {row.order.shippingAddress.state}</td>
              <td className="num text-right">{formatMoney(row.subtotalMinor, row.order.currency)}</td>
              <td><FulfillmentBadge status={row.status} /></td>
              <td className="text-right"><Link href={`/vendor/orders/${row.id}`} className="btn btn-ghost btn-sm">Open</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
