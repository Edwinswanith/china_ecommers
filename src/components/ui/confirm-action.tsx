"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { showToast } from "./toast";

type ServerAction = (formData: FormData) => Promise<void>;
type Fields = Readonly<Record<string, string>>;

interface ConfirmActionProps {
  readonly action: ServerAction;
  readonly fields: Fields;
  readonly label: string;
  readonly ariaLabel?: string;
  /** Ask before running. Leave out for actions that are safe to run straight away. */
  readonly confirm?: { readonly question: string; readonly yes: string };
  /** Shown as a toast once the action has finished. */
  readonly doneMessage: string;
  /** Adds an "Undo" button to the toast that runs this action. */
  readonly undo?: { readonly action: ServerAction; readonly fields: Fields };
}

const CONFIRM_TIMEOUT_MS = 7000;
const FLASH_MS = 2800;

function toFormData(fields: Fields): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

/**
 * A table-row action button with an optional "are you sure?" step, a busy
 * state on its row, and a confirmation toast that can offer Undo.
 */
export function ConfirmAction({ action, fields, label, ariaLabel, confirm, doneMessage, undo }: ConfirmActionProps) {
  const wrapper = useRef<HTMLSpanElement>(null);
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();

  // Dim the whole row while the change is being saved.
  useEffect(() => {
    const row = wrapper.current?.closest("tr");
    row?.classList.toggle("row-busy", pending);
    return () => row?.classList.remove("row-busy");
  }, [pending]);

  // An unanswered question quietly goes away.
  useEffect(() => {
    if (!asking) return;
    const timer = window.setTimeout(() => setAsking(false), CONFIRM_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [asking]);

  const flashRow = (): void => {
    const row = wrapper.current?.closest("tr");
    if (!row) return;
    row.classList.add("row-flash");
    window.setTimeout(() => row.classList.remove("row-flash"), FLASH_MS);
  };

  const run = (): void => {
    setAsking(false);
    startTransition(async () => {
      await action(toFormData(fields));
      flashRow();
      showToast({
        message: doneMessage,
        undo: undo ? async () => { await undo.action(toFormData(undo.fields)); } : undefined,
      });
    });
  };

  return (
    <span ref={wrapper} className="inline-flex items-center justify-end gap-2">
      {asking && confirm ? (
        <span className="animate-fade inline-flex items-center gap-2" role="group" aria-label={confirm.question} onKeyDown={(event) => { if (event.key === "Escape") setAsking(false); }}>
          <span className="whitespace-nowrap text-[13px] font-semibold">{confirm.question}</span>
          <button type="button" autoFocus className="btn btn-sm bg-danger text-white hover:bg-[#a82222]" onClick={run}>{confirm.yes}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsking(false)}>Cancel</button>
        </span>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm" aria-label={ariaLabel} disabled={pending} onClick={() => (confirm ? setAsking(true) : run())}>
          {pending ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : null}
          {label}
        </button>
      )}
    </span>
  );
}
