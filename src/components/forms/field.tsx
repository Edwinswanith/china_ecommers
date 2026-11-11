import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface BaseProps {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}

function Wrapper({ label, name, error, hint, children }: BaseProps & { children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="field-label">{label}</label>
      {children}
      {hint && !error ? <p id={`${name}-hint`} className="mt-1.5 text-[13px] text-subtle">{hint}</p> : null}
      {error ? <p id={`${name}-error`} role="alert" className="mt-1.5 text-[13px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}

const describedBy = (name: string, error?: string, hint?: string): string | undefined =>
  error ? `${name}-error` : hint ? `${name}-hint` : undefined;

export function TextField({ label, name, error, hint, ...rest }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Wrapper label={label} name={name} error={error} hint={hint}>
      <input id={name} name={name} className="input" aria-invalid={error ? true : undefined} aria-describedby={describedBy(name, error, hint)} {...rest} />
    </Wrapper>
  );
}

export function TextAreaField({ label, name, error, hint, ...rest }: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Wrapper label={label} name={name} error={error} hint={hint}>
      <textarea id={name} name={name} className="input" aria-invalid={error ? true : undefined} aria-describedby={describedBy(name, error, hint)} {...rest} />
    </Wrapper>
  );
}

export function SelectField({ label, name, error, hint, children, ...rest }: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Wrapper label={label} name={name} error={error} hint={hint}>
      <select id={name} name={name} className="input" aria-invalid={error ? true : undefined} aria-describedby={describedBy(name, error, hint)} {...rest}>
        {children}
      </select>
    </Wrapper>
  );
}
