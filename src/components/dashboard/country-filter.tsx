"use client";

import { ChevronDown, Globe, Loader2, MapPin, X, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { setCountryFilterAction } from "@/lib/actions/admin";
import type { CountryScope } from "@/lib/domain/country-scope";

interface CountryOption {
  readonly code: string;
  readonly name: string;
}

interface CountryFilterProps {
  scope: CountryScope;
  vendorCountries: readonly CountryOption[];
  customerCountries: readonly CountryOption[];
}

/** A single order's page always shows the whole order, so the filter has nothing to do there. */
const ORDER_DETAIL_PATH = /^\/admin\/orders\/[^/]+$/;

/**
 * The admin's country filter. It sits above every admin page and the choice
 * is remembered, so it stays on while moving between Overview, Orders,
 * Vendors and Products. It applies as soon as a country is picked.
 */
export function CountryFilter({ scope, vendorCountries, customerCountries }: CountryFilterProps) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(scope);
  if (ORDER_DETAIL_PATH.test(pathname)) return null;

  const apply = (next: CountryScope): void => {
    startTransition(async () => {
      setShown(next);
      const formData = new FormData();
      formData.set("vendorCountry", next.vendorCountry ?? "");
      formData.set("customerCountry", next.customerCountry ?? "");
      await setCountryFilterAction(formData);
    });
  };
  const active = shown.vendorCountry !== null || shown.customerCountry !== null;

  return (
    <section aria-label="Filter by country" aria-busy={pending} className="mb-6 flex flex-wrap items-end gap-x-4 gap-y-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-[var(--shadow-card)]">
      <CountrySelect
        id="filter-vendor-country"
        label="Vendor country"
        icon={Globe}
        value={shown.vendorCountry}
        options={vendorCountries}
        onChange={(vendorCountry) => apply({ ...shown, vendorCountry })}
      />
      <CountrySelect
        id="filter-customer-country"
        label="Customer country"
        icon={MapPin}
        value={shown.customerCountry}
        options={customerCountries}
        onChange={(customerCountry) => apply({ ...shown, customerCountry })}
      />
      <div className="flex h-10 items-center gap-3">
        {active ? (
          <button type="button" onClick={() => apply({ vendorCountry: null, customerCountry: null })} className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13.5px] font-medium text-subtle transition-colors hover:bg-muted hover:text-fg">
            <X size={15} aria-hidden="true" /> Show all countries
          </button>
        ) : null}
        {pending ? <Loader2 size={17} className="animate-spin text-brand" aria-label="Updating figures" /> : null}
      </div>
    </section>
  );
}

interface CountrySelectProps {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string | null;
  options: readonly CountryOption[];
  onChange: (code: string | null) => void;
}

function CountrySelect({ id, label, icon: Icon, value, options, onChange }: CountrySelectProps) {
  return (
    <div className="min-w-[11rem] flex-1 sm:flex-none">
      <label htmlFor={id} className="mb-1 block text-[12.5px] font-semibold text-subtle">{label}</label>
      <div className="relative flex items-center">
        <Icon size={15} className={`pointer-events-none absolute left-3 ${value ? "text-brand" : "text-subtle"}`} aria-hidden="true" />
        <select
          id={id}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
          className={`h-10 w-full cursor-pointer appearance-none rounded-xl border pl-9 pr-9 text-[14px] font-medium transition-colors focus:border-brand focus:outline-none ${value ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white hover:bg-muted"}`}
        >
          <option value="">All countries</option>
          {options.map((option) => (
            <option key={option.code} value={option.code}>{option.name}</option>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 text-subtle" aria-hidden="true" />
      </div>
    </div>
  );
}
