import type { ZodError } from "zod";

export interface FormState {
  readonly ok?: boolean;
  readonly message?: string;
  readonly fieldErrors?: Readonly<Record<string, string>>;
}

export const EMPTY_FORM_STATE: FormState = {};

export function zodFormState(error: ZodError): FormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}
