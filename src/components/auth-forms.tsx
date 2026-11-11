"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, registerVendorAction } from "@/lib/actions/auth";
import { VENDOR_COUNTRIES } from "@/lib/config/markets";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import { SelectField, TextAreaField, TextField } from "./forms/field";
import { FormMessage } from "./forms/form-message";
import { SubmitButton } from "./forms/submit-button";

interface NextProps {
  next?: string;
}

const withNext = (path: string, next?: string): string => (next ? `${path}?next=${encodeURIComponent(next)}` : path);

export function LoginForm({ next }: NextProps) {
  const [state, action] = useActionState(loginAction, EMPTY_FORM_STATE);
  return (
    <form action={action} className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <TextField label="Email" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      <TextField label="Password" name="password" type="password" autoComplete="current-password" required error={state.fieldErrors?.password} />
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full" pendingLabel="Signing in…">Sign in</SubmitButton>
      <p className="text-center text-[15px] text-subtle">
        New here?{" "}
        <Link href={withNext("/register", next)} className="link">Create an account</Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: NextProps) {
  const [state, action] = useActionState(registerAction, EMPTY_FORM_STATE);
  return (
    <form action={action} className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <TextField label="Full name" name="name" autoComplete="name" required error={state.fieldErrors?.name} />
      <TextField label="Email" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      <TextField label="Password" name="password" type="password" autoComplete="new-password" minLength={8} required hint="At least 8 characters." error={state.fieldErrors?.password} />
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full" pendingLabel="Creating account…">Create account</SubmitButton>
      <p className="text-center text-[15px] text-subtle">
        Already have an account?{" "}
        <Link href={withNext("/login", next)} className="link">Sign in</Link>
      </p>
    </form>
  );
}

export function VendorRegisterForm() {
  const [state, action] = useActionState(registerVendorAction, EMPTY_FORM_STATE);
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Business name" name="businessName" autoComplete="organization" required error={state.fieldErrors?.businessName} />
        <TextField label="Your name" name="name" autoComplete="name" required error={state.fieldErrors?.name} />
        <SelectField label="Country you ship from" name="countryCode" required defaultValue="CN" error={state.fieldErrors?.countryCode}>
          {Object.entries(VENDOR_COUNTRIES).map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </SelectField>
        <TextField label="City" name="city" autoComplete="address-level2" required error={state.fieldErrors?.city} />
        <TextField label="Work email" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
        <TextField label="Phone (optional)" name="contactPhone" type="tel" autoComplete="tel" error={state.fieldErrors?.contactPhone} />
      </div>
      <TextField label="Password" name="password" type="password" autoComplete="new-password" minLength={8} required hint="At least 8 characters." error={state.fieldErrors?.password} />
      <TextAreaField label="About your business (optional)" name="about" maxLength={400} placeholder="One or two lines buyers will see." error={state.fieldErrors?.about} />
      <FormMessage state={state} />
      <SubmitButton className="btn btn-dark w-full" pendingLabel="Opening your account…">Open vendor account</SubmitButton>
    </form>
  );
}
