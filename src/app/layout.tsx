import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { NavProgress } from "@/components/ui/nav-progress";
import { Toaster } from "@/components/ui/toast";
import { BRAND } from "@/lib/config/brand";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s | ${BRAND.name}` },
  description: BRAND.description,
  applicationName: BRAND.name,
  openGraph: { type: "website", siteName: BRAND.name, locale: "en_IN", url: BRAND.url, title: BRAND.name, description: BRAND.description },
  twitter: { card: "summary_large_image", title: BRAND.name, description: BRAND.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={jakarta.variable}>
      <body className="flex min-h-screen flex-col bg-white">
        {/* Without scripts nothing can reveal the animated content, so show it straight away. */}
        <noscript>
          <style>{".reveal{opacity:1;transform:none}.count-pending{visibility:visible}.chart-waiting .draw-in{stroke-dashoffset:0}.chart-waiting .fade-in{visibility:visible}"}</style>
        </noscript>
        <NavProgress />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
