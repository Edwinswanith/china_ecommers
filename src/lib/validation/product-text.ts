import type { ProductFaq, ProductSpec } from "@/lib/db/schema";

/** Vendors enter list fields as plain text, one entry per line. */
const lines = (text: string): string[] =>
  text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);

export function parseHighlights(text: string): string[] {
  return lines(text).slice(0, 8);
}

/** "Label: value" per line. */
export function parseSpecs(text: string): ProductSpec[] {
  return lines(text)
    .map((line) => {
      const at = line.indexOf(":");
      return at > 0 ? { label: line.slice(0, at).trim(), value: line.slice(at + 1).trim() } : null;
    })
    .filter((spec): spec is ProductSpec => spec !== null && spec.value.length > 0)
    .slice(0, 16);
}

/** "Question? | Answer" per line. */
export function parseFaqs(text: string): ProductFaq[] {
  return lines(text)
    .map((line) => {
      const at = line.indexOf("|");
      return at > 0 ? { q: line.slice(0, at).trim(), a: line.slice(at + 1).trim() } : null;
    })
    .filter((faq): faq is ProductFaq => faq !== null && faq.a.length > 0)
    .slice(0, 10);
}

export const formatHighlights = (items: readonly string[]): string => items.join("\n");
export const formatSpecs = (items: readonly ProductSpec[]): string => items.map((s) => `${s.label}: ${s.value}`).join("\n");
export const formatFaqs = (items: readonly ProductFaq[]): string => items.map((f) => `${f.q} | ${f.a}`).join("\n");
