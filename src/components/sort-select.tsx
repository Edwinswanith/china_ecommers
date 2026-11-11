"use client";

import { ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";

interface SortSelectProps {
  basePath: string;
  sort: string;
  query?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}

/** Applies the sort as soon as it is chosen; no separate "Apply" button. */
export function SortSelect({ basePath, sort, query, options }: SortSelectProps) {
  const router = useRouter();
  return (
    <label className="relative flex items-center">
      <span className="sr-only">Sort products</span>
      <ArrowUpDown size={15} className="pointer-events-none absolute left-3 text-subtle" aria-hidden="true" />
      <select
        value={sort}
        onChange={(event) => {
          const params = new URLSearchParams();
          if (query) params.set("q", query);
          if (event.target.value !== "newest") params.set("sort", event.target.value);
          const search = params.toString();
          router.push(search ? `${basePath}?${search}` : basePath);
        }}
        className="h-10 cursor-pointer appearance-none rounded-full border border-line bg-white pl-9 pr-4 text-[14px] font-medium transition-colors hover:bg-muted focus:border-brand focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
