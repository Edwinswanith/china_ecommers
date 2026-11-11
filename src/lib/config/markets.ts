/**
 * Markets = where customers buy. Vendor countries = where sellers ship from.
 * India is the only selling market at launch; adding another is a config
 * change here plus prices in that currency.
 */
export interface Currency {
  readonly code: string;
  readonly symbol: string;
  readonly minorUnits: number;
  readonly locale: string;
}

export const CURRENCIES: Readonly<Record<string, Currency>> = {
  INR: { code: "INR", symbol: "₹", minorUnits: 2, locale: "en-IN" },
  USD: { code: "USD", symbol: "$", minorUnits: 2, locale: "en-US" },
};

export interface Market {
  readonly code: string;
  readonly name: string;
  readonly currency: string;
  readonly enabled: boolean;
}

export const MARKETS: readonly Market[] = [
  { code: "IN", name: "India", currency: "INR", enabled: true },
];

export const DEFAULT_MARKET: Market = MARKETS[0];

/** Countries a vendor can operate and ship from. */
export const VENDOR_COUNTRIES: Readonly<Record<string, string>> = {
  CN: "China",
  IN: "India",
  HK: "Hong Kong",
  TW: "Taiwan",
  JP: "Japan",
  KR: "South Korea",
  SG: "Singapore",
  MY: "Malaysia",
  TH: "Thailand",
  VN: "Vietnam",
  ID: "Indonesia",
  PH: "Philippines",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  TR: "Türkiye",
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  GB: "United Kingdom",
  US: "United States",
  CA: "Canada",
  AU: "Australia",
};

export function countryName(code: string): string {
  return VENDOR_COUNTRIES[code] ?? code;
}

export const INDIAN_STATES: readonly string[] = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep",
];
