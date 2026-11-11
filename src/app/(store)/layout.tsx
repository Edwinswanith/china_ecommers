import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// Storefront pages read live catalogue data and the session cookie on every request.
export const dynamic = "force-dynamic";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="btn btn-dark sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50">Skip to content</a>
      <SiteHeader />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
