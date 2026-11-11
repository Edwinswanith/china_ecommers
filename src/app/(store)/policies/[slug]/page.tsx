import { Info } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPolicy } from "@/lib/config/policies";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const policy = getPolicy((await params).slug);
  if (!policy) return {};
  return { title: policy.title, description: policy.summary, alternates: { canonical: `/policies/${policy.slug}` } };
}

export default async function PolicyPage({ params }: PageProps) {
  const policy = getPolicy((await params).slug);
  if (!policy) notFound();
  return (
    <article className="shell max-w-3xl py-10 md:py-14">
      <p className="text-[14px] font-medium text-brand">Help centre</p>
      <h1 className="display mt-1 text-3xl md:text-4xl">{policy.title}</h1>
      <p className="mt-3 text-[17px] text-subtle">{policy.summary}</p>
      {policy.placeholder ? (
        <p className="mt-6 flex items-start gap-2.5 rounded-xl bg-amber-50 p-4 text-[14.5px] text-amber-900">
          <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> This page is a draft. The final policy will be published here before launch.
        </p>
      ) : null}
      <div className="prose-copy mt-2 text-[16px] leading-relaxed">
        {policy.body.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            <p>{section.text}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
