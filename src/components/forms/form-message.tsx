import { CircleAlert, CircleCheck } from "lucide-react";
import type { FormState } from "@/lib/form-state";

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  const ok = state.ok === true;
  const Icon = ok ? CircleCheck : CircleAlert;
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`animate-fade flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[14px] font-medium ${ok ? "bg-ok-soft text-ok" : "bg-red-50 text-danger"}`}
    >
      <Icon size={18} className="mt-px shrink-0" aria-hidden="true" />
      {state.message}
    </p>
  );
}
