import type { Order } from "@/lib/db/schema";
import { formatMoney } from "@/lib/domain/money";

export function AddressBlock({ order }: { order: Pick<Order, "shippingAddress"> }) {
  const a = order.shippingAddress;
  return (
    <address className="text-[15px] not-italic leading-relaxed">
      <strong className="font-semibold">{a.fullName}</strong>
      <br />
      {a.line1}
      {a.line2 ? <>, {a.line2}</> : null}
      <br />
      {a.city}, {a.state} {a.postalCode}
      <br />
      India · <span className="num">+91 {a.phone}</span>
    </address>
  );
}

export function TotalsBlock({ order }: { order: Order }) {
  const paid = order.paymentStatus === "paid";
  return (
    <dl className="space-y-2.5 text-[14.5px]">
      <div className="flex justify-between"><dt>Subtotal</dt><dd className="num">{formatMoney(order.subtotalMinor, order.currency)}</dd></div>
      <div className="flex justify-between text-subtle"><dt>Shipping</dt><dd className="num">{order.shippingMinor > 0 ? formatMoney(order.shippingMinor, order.currency) : "—"}</dd></div>
      <div className="flex justify-between text-subtle"><dt>Duties &amp; taxes</dt><dd className="num">{order.dutiesMinor > 0 ? formatMoney(order.dutiesMinor, order.currency) : "—"}</dd></div>
      <div className="flex justify-between border-t border-line pt-3 text-[16px] font-bold"><dt>Total</dt><dd className="num">{formatMoney(order.totalMinor, order.currency)}</dd></div>
      <div className="flex justify-between pt-1 text-[13.5px] text-subtle">
        <dt>Payment</dt>
        <dd className="font-medium">{paid ? "Paid" : "Not paid"}{order.paymentProvider === "placeholder" ? " (test mode)" : ""}</dd>
      </div>
    </dl>
  );
}
