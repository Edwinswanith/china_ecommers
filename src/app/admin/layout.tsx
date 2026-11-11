import type { Metadata } from "next";
import { CountryFilter } from "@/components/dashboard/country-filter";
import { DashboardShell } from "@/components/dashboard/shell";
import { requireAdmin } from "@/lib/auth/guards";
import { getAdminScope, listScopeOptions } from "@/lib/data/admin-scope";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const [{ scope }, options] = await Promise.all([getAdminScope(), listScopeOptions()]);
  return (
    <DashboardShell
      area="Admin"
      subtitle="Store owner view"
      userName={session.email}
      nav={[
        { href: "/admin", label: "Overview", icon: "overview", exact: true },
        { href: "/admin/orders", label: "Orders", icon: "orders" },
        { href: "/admin/vendors", label: "Vendors", icon: "vendors" },
        { href: "/admin/products", label: "Products", icon: "products" },
      ]}
    >
      <CountryFilter scope={scope} vendorCountries={options.vendorCountries} customerCountries={options.customerCountries} />
      {children}
    </DashboardShell>
  );
}
