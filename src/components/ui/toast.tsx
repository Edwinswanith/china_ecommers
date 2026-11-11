"use client";

import { CircleCheck, X } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

export interface ToastInput {
  readonly message: string;
  /** Adds an "Undo" button that runs this when pressed. */
  readonly undo?: () => void | Promise<void>;
}

interface Toast extends ToastInput {
  readonly id: number;
}

const VISIBLE_MS = 5000;
/** Longer when there is something to undo, so there is time to read it and react. */
const VISIBLE_WITH_UNDO_MS = 9000;
const MAX_TOASTS = 3;
const EMPTY: readonly Toast[] = [];

let toasts: readonly Toast[] = EMPTY;
let nextId = 1;
const listeners = new Set<() => void>();

function publish(next: readonly Toast[]): void {
  toasts = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function dismiss(id: number): void {
  publish(toasts.filter((toast) => toast.id !== id));
}

/** Show a short confirmation at the bottom of the screen. */
export function showToast(input: ToastInput): void {
  publish([...toasts, { ...input, id: nextId++ }].slice(-MAX_TOASTS));
}

function ToastItem({ toast }: { toast: Toast }) {
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), toast.undo ? VISIBLE_WITH_UNDO_MS : VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.undo]);

  return (
    <li className="toast pointer-events-auto flex items-center gap-3 rounded-xl bg-fg py-2.5 pl-3.5 pr-2 text-[14px] font-medium text-white shadow-[var(--shadow-lift)] ring-1 ring-white/15">
      <CircleCheck size={18} className="shrink-0 text-emerald-400" aria-hidden="true" />
      <span className="min-w-0 flex-1">{toast.message}</span>
      {toast.undo ? (
        <button
          type="button"
          className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[13.5px] font-bold text-sky-300 transition-colors hover:bg-white/10"
          onClick={() => {
            dismiss(toast.id);
            void toast.undo?.();
          }}
        >
          Undo
        </button>
      ) : null}
      <button type="button" className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white" aria-label="Dismiss" onClick={() => dismiss(toast.id)}>
        <X size={16} aria-hidden="true" />
      </button>
    </li>
  );
}

/** Renders the toast messages. Mounted once in the root layout. */
export function Toaster() {
  const current = useSyncExternalStore(subscribe, () => toasts, () => EMPTY);
  return (
    <ul role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] mx-auto flex w-full max-w-md flex-col gap-2 p-4">
      {current.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </ul>
  );
}
