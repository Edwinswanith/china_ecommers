import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/shell";
import { requireVendor } from "@/lib/auth/guards";
import { countryName } from "@/lib/config/markets";
import { getVendorStats } from "@/lib/data/vendor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Vendor portal", template: "%s | Vendor portal" }, robots: { index: false, follow: false } };

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const { session, vendor } = await requireVendor();
  const stats = await getVendorStats(vendor.id);
  const open = stats.byStatus.new + stats.byStatus.accepted + stats.byStatus.packed;
  return (
    <DashboardShell
      area="Vendor portal"
      subtitle={`${vendor.name} · ${vendor.city}, ${countryName(vendor.countryCode)}`}
      userName={session.email}
      nav={[
        { href: "/vendor", label: "Overview", icon: "overview", exact: true },
        { href: "/vendor/orders", label: "Orders", icon: "orders", count: open },
        { href: "/vendor/products", label: "Products", icon: "products" },
      ]}
    >
      {vendor.status === "suspended" ? (
        <p role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-[14.5px] font-medium text-danger">
          Your vendor account is suspended. Your products are hidden from the store and you cannot make changes. Contact the store admin.
        </p>
      ) : null}
      {children}
    </DashboardShell>
  );
}
