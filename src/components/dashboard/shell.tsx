import { ArrowUpRight, ExternalLink, LogOut, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";
import { Wordmark } from "../site-header";
import { AnimatedNumber, type NumberFormat } from "../ui/animated-number";
import { NavLinks, type NavItem } from "./nav-links";

interface DashboardShellProps {
  area: string;
  subtitle: string;
  userName: string;
  nav: readonly NavItem[];
  children: React.ReactNode;
}

/** Shared frame for the vendor portal and the admin panel. */
export function DashboardShell({ area, subtitle, userName, nav, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-muted lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-line bg-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block lg:py-5">
          <Wordmark />
          <div className="text-right lg:mt-5 lg:rounded-xl lg:bg-muted lg:p-3 lg:text-left">
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-brand">{area}</p>
            <p className="mt-0.5 hidden text-[13.5px] leading-snug text-subtle lg:block">{subtitle}</p>
          </div>
        </div>
        <NavLinks items={nav} />
        <div className="mt-auto hidden border-t border-line p-4 lg:block">
          <p className="truncate px-1 text-[13.5px] font-medium">{userName}</p>
          <div className="mt-2 flex flex-col gap-0.5 text-[14px]">
            <Link href="/" className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-subtle transition-colors hover:bg-muted hover:text-fg"><ExternalLink size={16} aria-hidden="true" /> View store</Link>
            <form action={logoutAction}>
              <button type="submit" className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-subtle transition-colors hover:bg-muted hover:text-fg"><LogOut size={16} aria-hidden="true" /> Sign out</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="display text-2xl md:text-[1.75rem]">{title}</h1>
        {eyebrow ? <p className="mt-1 text-[14.5px] text-subtle">{eyebrow}</p> : null}
      </div>
      {action}
    </header>
  );
}

interface StatTileProps {
  label: string;
  /** The figure as text. Used as-is unless `count` is given. */
  value: string;
  /** The same figure as a number, so it can count up when the page opens. */
  count?: { value: number; format: NumberFormat };
  note?: string;
  icon?: LucideIcon;
  /** "signal" draws attention to a number that needs action. */
  tone?: "default" | "signal" | "dark";
  href?: string;
}

const ICON_TONES = { default: "bg-muted text-fg", signal: "bg-amber-50 text-amber-700", dark: "bg-brand-soft text-brand" } as const;

export function StatTile({ label, value, count, note, icon: Icon, tone = "default", href }: StatTileProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[14px] font-medium text-subtle">{label}</p>
        {Icon ? <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${ICON_TONES[tone]}`}><Icon size={18} aria-hidden="true" /></span> : null}
      </div>
      <p className="num mt-2 text-[1.75rem] font-bold leading-tight tracking-tight">{count ? <AnimatedNumber value={count.value} format={count.format} countUpOnMount /> : value}</p>
      {note ? (
        <p className="mt-1.5 flex items-center gap-1 text-[13.5px] text-subtle">
          {note}
          {href ? <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" /> : null}
        </p>
      ) : null}
    </>
  );
  const className = `group block rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] ${tone === "signal" ? "border-amber-200" : "border-line"}`;
  return href ? <Link href={href} className={`${className} lift`}>{body}</Link> : <div className={className}>{body}</div>;
}
