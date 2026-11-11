import { requireAdmin } from "@/lib/auth/guards";
import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/status-badge";
import { setVendorStatusAction } from "@/lib/actions/admin";
import { countryName } from "@/lib/config/markets";
import { listVendorSales } from "@/lib/data/admin";
import { formatMoney } from "@/lib/domain/money";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Vendors" };

export default async function AdminVendorsPage() {
  await requireAdmin();
  const vendors = await listVendorSales();
  const countries = new Set(vendors.map((v) => v.countryCode)).size;
  return (
    <>
      <PageHeader eyebrow={`${vendors.length} vendors · ${countries} ${countries === 1 ? "country" : "countries"}`} title="Vendors" />
      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Location</th>
              <th>Joined</th>
              <th className="text-right">Products</th>
              <th className="text-right">Shipments</th>
              <th className="text-right">Pending</th>
              <th className="text-right">Sales</th>
              <th>Status</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((vendor) => {
              const suspended = vendor.status === "suspended";
              return (
                <tr key={vendor.id}>
                  <td>
                    <span className="font-medium">{vendor.name}</span>
                    <span className="block text-[12.5px] text-subtle">{vendor.contactEmail}</span>
                  </td>
                  <td className="whitespace-nowrap">{vendor.city}, {countryName(vendor.countryCode)}</td>
                  <td className="whitespace-nowrap text-subtle">{formatDate(vendor.createdAt)}</td>
                  <td className="num text-right">{vendor.productCount}</td>
                  <td className="num text-right">{vendor.shipmentCount}</td>
                  <td className={`num text-right ${vendor.pendingCount > 0 ? "font-bold text-amber-700" : ""}`}>{vendor.pendingCount}</td>
                  <td className="num text-right font-semibold">{formatMoney(vendor.revenueMinor, "INR")}</td>
                  <td>{suspended ? <Badge tone="signal">Suspended</Badge> : <Badge tone="ok">Active</Badge>}</td>
                  <td className="text-right">
                    <form action={setVendorStatusAction}>
                      <input type="hidden" name="vendorId" value={vendor.id} />
                      <input type="hidden" name="status" value={suspended ? "active" : "suspended"} />
                      <button type="submit" className="btn btn-ghost btn-sm">{suspended ? "Reinstate" : "Suspend"}</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-2xl text-[14px] text-subtle">Suspending a vendor immediately hides all of their products from the store and blocks them from editing. Existing orders are not affected.</p>
    </>
  );
}
