import { ChevronDown } from "lucide-react";
import type { Faq } from "@/lib/config/faq";

export function FaqList({ faqs }: { faqs: readonly Faq[] }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      {faqs.map((faq) => (
        <details key={faq.q} className="faq group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-5 py-4 transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
            <h3 className="text-[16px] font-semibold leading-snug">{faq.q}</h3>
            <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-subtle transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <p className="animate-fade max-w-3xl px-5 pb-5 text-[15px] leading-relaxed text-subtle">{faq.a}</p>
        </details>
      ))}
    </div>
  );
}
