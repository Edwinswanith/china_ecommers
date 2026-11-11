import { CURRENCIES } from "@/lib/config/markets";

/** Format an integer minor-unit amount (e.g. paise) for display. */
export function formatMoney(amountMinor: number, currencyCode: string): string {
  const currency = CURRENCIES[currencyCode];
  if (!currency) throw new Error(`Unsupported currency: ${currencyCode}`);
  const divisor = 10 ** currency.minorUnits;
  const hasFraction = amountMinor % divisor !== 0;
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: hasFraction ? currency.minorUnits : 0,
    maximumFractionDigits: currency.minorUnits,
  }).format(amountMinor / divisor);
}

/** Round a minor-unit amount to whole currency units (no paise). For averages and estimates, where paise are false precision. */
export function roundToWholeUnits(amountMinor: number, minorUnits = 2): number {
  const divisor = 10 ** minorUnits;
  return Math.round(amountMinor / divisor) * divisor;
}

/** Parse a user-entered decimal price ("2499", "19.99") into minor units. */
export function toMinor(input: string, minorUnits = 2): number {
  const value = input.trim();
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${minorUnits}})?$`);
  if (!pattern.test(value)) throw new Error(`Invalid amount: ${input}`);
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 10 ** minorUnits + Number(fraction.padEnd(minorUnits, "0"));
}

/** Minor units back to a plain decimal string for form inputs. */
export function fromMinor(amountMinor: number, minorUnits = 2): string {
  const divisor = 10 ** minorUnits;
  return amountMinor % divisor === 0 ? String(amountMinor / divisor) : (amountMinor / divisor).toFixed(minorUnits);
}
