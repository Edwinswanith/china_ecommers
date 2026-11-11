"use client";

import { Check, Eye, EyeOff } from "lucide-react";
import { useState, type FocusEvent, type FormEvent, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface BaseProps {
  label: string;
  name: string;
  /** Message from the server after a submit. */
  error?: string;
  hint?: string;
}

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** A plain-language message for whatever the browser found wrong with the field. */
function describeProblem(element: FieldElement, label: string): string {
  const { validity } = element;
  const name = label.replace(/\s*\(.*\)\s*$/, "");
  if (validity.valueMissing) return `${name} is required.`;
  if (validity.typeMismatch && element.getAttribute("type") === "email") return "Enter a full email address, like name@example.com.";
  if (validity.tooShort) return `Use at least ${element.getAttribute("minlength")} characters.`;
  if (validity.patternMismatch) return element.title || "Check the format of this field.";
  if (validity.rangeUnderflow) return `Must be ${element.getAttribute("min")} or more.`;
  if (validity.rangeOverflow) return `Must be ${element.getAttribute("max")} or less.`;
  if (validity.badInput || validity.stepMismatch) return "Enter a whole number.";
  return element.validationMessage;
}

interface FieldCheck {
  /** Message to show under the field, if any. */
  readonly message: string | undefined;
  /** True once the user has filled the field in correctly. */
  readonly valid: boolean;
  readonly handlers: {
    onBlur: (event: FocusEvent<FieldElement>) => void;
    onInput: (event: FormEvent<FieldElement>) => void;
    onInvalid: (event: FormEvent<FieldElement>) => void;
  };
}

/**
 * Checks a field as soon as the user leaves it, using the rules already on the
 * element (required, type, minLength, pattern, min, max), and keeps checking
 * while they correct it. A server error stays until the user edits the field.
 */
function useFieldCheck(label: string, serverError: string | undefined): FieldCheck {
  const [problem, setProblem] = useState<string | null>(null);
  const [valid, setValid] = useState(false);
  const [touched, setTouched] = useState(false);
  const [dismissedError, setDismissedError] = useState<string | undefined>(undefined);

  const check = (element: FieldElement): void => {
    const ok = element.checkValidity();
    setProblem(ok ? null : describeProblem(element, label));
    setValid(ok && element.value.trim() !== "" && !("readOnly" in element && element.readOnly));
  };

  return {
    message: serverError && serverError !== dismissedError ? serverError : (problem ?? undefined),
    valid: valid && !(serverError && serverError !== dismissedError),
    handlers: {
      onBlur: (event) => {
        setTouched(true);
        check(event.currentTarget);
      },
      onInput: (event) => {
        setDismissedError(serverError);
        if (touched) check(event.currentTarget);
      },
      // Fires when the form is submitted with this field still wrong. Show our own message instead of the browser's bubble.
      onInvalid: (event) => {
        event.preventDefault();
        const element = event.currentTarget;
        setTouched(true);
        setProblem(describeProblem(element, label));
        setValid(false);
        if (element.form?.querySelector(":invalid") === element) element.focus();
      },
    },
  };
}

function Wrapper({ label, name, message, hint, children }: { label: string; name: string; message?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="field-label">{label}</label>
      {children}
      {hint && !message ? <p id={`${name}-hint`} className="mt-1.5 text-[13px] text-subtle">{hint}</p> : null}
      {message ? <p id={`${name}-error`} role="alert" className="animate-fade mt-1.5 text-[13px] font-medium text-danger">{message}</p> : null}
    </div>
  );
}

const describedBy = (name: string, message?: string, hint?: string): string | undefined =>
  message ? `${name}-error` : hint ? `${name}-hint` : undefined;

function ValidTick({ className }: { className: string }) {
  return (
    <span className={`animate-pop pointer-events-none absolute grid h-5 w-5 place-items-center rounded-full bg-ok text-white ${className}`} aria-hidden="true">
      <Check size={12} strokeWidth={3.5} />
    </span>
  );
}

export function TextField({ label, name, error, hint, type, className = "", ...rest }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const { message, valid, handlers } = useFieldCheck(label, error);
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  // Number inputs keep their own controls on the right, so they get no tick.
  const showTick = valid && type !== "number";
  return (
    <Wrapper label={label} name={name} message={message} hint={hint}>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={isPassword && revealed ? "text" : type}
          className={`input ${isPassword ? "pr-20" : showTick ? "pr-10" : ""} ${className}`}
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy(name, message, hint)}
          {...rest}
          {...handlers}
        />
        {showTick ? <ValidTick className={`top-1/2 -translate-y-1/2 ${isPassword ? "right-12" : "right-3"}`} /> : null}
        {isPassword ? (
          <button
            type="button"
            className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-subtle transition-colors hover:bg-muted hover:text-fg"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
          >
            {revealed ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        ) : null}
      </div>
    </Wrapper>
  );
}

export function TextAreaField({ label, name, error, hint, ...rest }: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { message, handlers } = useFieldCheck(label, error);
  return (
    <Wrapper label={label} name={name} message={message} hint={hint}>
      <textarea id={name} name={name} className="input" aria-invalid={message ? true : undefined} aria-describedby={describedBy(name, message, hint)} {...rest} {...handlers} />
    </Wrapper>
  );
}

export function SelectField({ label, name, error, hint, children, ...rest }: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const { message, handlers } = useFieldCheck(label, error);
  return (
    <Wrapper label={label} name={name} message={message} hint={hint}>
      <select id={name} name={name} className="input" aria-invalid={message ? true : undefined} aria-describedby={describedBy(name, message, hint)} {...rest} {...handlers} onChange={handlers.onInput}>
        {children}
      </select>
    </Wrapper>
  );
}
