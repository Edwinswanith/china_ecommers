/**
 * Sales trend and forecast calculations. Pure functions with no database or
 * clock access: callers pass in "today" so results are repeatable and testable.
 *
 * Days are identified by a key like "2026-11-05" in the store's own time zone.
 */

export const STORE_TIME_ZONE = "Asia/Kolkata";
export const DAYS_PER_WEEK = 7;
export const FORECAST_WEEKS = 4;
/** Fewer selling weeks than this and a trend line would be guesswork. */
export const MIN_WEEKS_FOR_FORECAST = 4;
/** Weekly change smaller than this share of average sales is called flat. */
const FLAT_TREND_THRESHOLD = 0.01;
/** Width of the "likely range": about 80% of outcomes if the past pattern holds. */
const RANGE_Z_SCORE = 1.28;

const DAY_MS = 86_400_000;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** The store-local calendar day an instant falls on, e.g. "2026-11-05". */
export function dayKeyOf(date: Date): string {
  return dayKeyFormat.format(date);
}

const toUtc = (dayKey: string): number => Date.parse(`${dayKey}T00:00:00Z`);

export function addDays(dayKey: string, days: number): string {
  return new Date(toUtc(dayKey) + days * DAY_MS).toISOString().slice(0, 10);
}

/** "5 Nov" */
export function shortDayLabel(dayKey: string): string {
  const [, month, day] = dayKey.split("-").map(Number);
  return `${day} ${MONTH_NAMES[month - 1]}`;
}

/** "Nov 2026" */
export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export interface DailyValue {
  readonly day: string;
  readonly value: number;
}

/** A value for every one of the last `days` days ending on `endDay`, oldest first. Missing days are zero. */
export function fillDaily(rows: readonly DailyValue[], endDay: string, days: number): number[] {
  const byDay = new Map<string, number>();
  for (const row of rows) byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.value);
  return Array.from({ length: days }, (_, index) => byDay.get(addDays(endDay, index - (days - 1))) ?? 0);
}

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

/** Total of the most recent `days` values, skipping the latest `offset` days first. */
export function sumWindow(daily: readonly number[], days: number, offset = 0): number {
  const end = daily.length - offset;
  return sum(daily.slice(Math.max(end - days, 0), Math.max(end, 0)));
}

/**
 * Totals for consecutive 7-day windows ending on the last day, oldest first.
 * Rolling windows mean the most recent "week" is always complete, so it never
 * looks like a drop just because the calendar week is unfinished.
 */
export function rollingWeeks(daily: readonly number[], weeks: number): number[] {
  return Array.from({ length: weeks }, (_, index) => sumWindow(daily, DAYS_PER_WEEK, (weeks - 1 - index) * DAYS_PER_WEEK));
}

export interface MonthTotal {
  readonly month: string;
  readonly value: number;
}

/** Calendar-month totals for the last `months` months ending with the month of `endDay`, oldest first. */
export function calendarMonths(rows: readonly DailyValue[], endDay: string, months: number): MonthTotal[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = row.day.slice(0, 7);
    totals.set(key, (totals.get(key) ?? 0) + row.value);
  }
  const [endYear, endMonth] = endDay.split("-").map(Number);
  return Array.from({ length: months }, (_, index) => {
    const monthsBack = months - 1 - index;
    const date = new Date(Date.UTC(endYear, endMonth - 1 - monthsBack, 1));
    const key = date.toISOString().slice(0, 7);
    return { month: key, value: totals.get(key) ?? 0 };
  });
}

/** Change from `previous` to `current` as a fraction (0.18 = up 18%). Null when there is nothing to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}

export type TrendDirection = "growing" | "flat" | "declining";

export type Forecast =
  | { readonly ok: false; readonly reason: "not-enough-data" }
  | {
      readonly ok: true;
      /** Projected value for each coming period. */
      readonly points: readonly number[];
      readonly low: readonly number[];
      readonly high: readonly number[];
      readonly total: number;
      readonly totalLow: number;
      readonly totalHigh: number;
      readonly direction: TrendDirection;
      /** Average change per period as a fraction of average sales (0.05 = about 5% a period). */
      readonly changePerPeriod: number;
      /** How many past periods the trend was fitted to. */
      readonly basedOn: number;
    };

/**
 * Project the next `horizon` periods by fitting a straight line through the
 * history (ordinary least squares). The range is the line plus or minus the
 * typical distance the past values sat from it. Deliberately simple: with a
 * few months of history, anything cleverer would only look more certain.
 */
export function linearForecast(history: readonly number[], horizon: number = FORECAST_WEEKS): Forecast {
  // Ignore the quiet run-up before the first sale so a new store is not judged on empty weeks.
  const firstSale = history.findIndex((value) => value > 0);
  const values = firstSale === -1 ? [] : history.slice(firstSale);
  const n = values.length;
  if (n < MIN_WEEKS_FOR_FORECAST || values.filter((value) => value > 0).length < MIN_WEEKS_FOR_FORECAST) {
    return { ok: false, reason: "not-enough-data" };
  }

  const meanX = (n - 1) / 2;
  const meanY = sum(values) / n;
  const covariance = sum(values.map((y, x) => (x - meanX) * (y - meanY)));
  const variance = sum(values.map((_, x) => (x - meanX) ** 2));
  const slope = covariance / variance;
  const intercept = meanY - slope * meanX;
  const fitted = (x: number): number => intercept + slope * x;

  const residualSpread = Math.sqrt(sum(values.map((y, x) => (y - fitted(x)) ** 2)) / Math.max(n - 2, 1));
  const margin = RANGE_Z_SCORE * residualSpread;
  const clamp = (value: number): number => Math.max(0, Math.round(value));

  const steps = Array.from({ length: horizon }, (_, index) => n + index);
  const points = steps.map((x) => clamp(fitted(x)));
  const low = steps.map((x) => clamp(fitted(x) - margin));
  const high = steps.map((x) => clamp(fitted(x) + margin));
  const changePerPeriod = meanY > 0 ? slope / meanY : 0;
  const direction: TrendDirection = Math.abs(changePerPeriod) < FLAT_TREND_THRESHOLD ? "flat" : changePerPeriod > 0 ? "growing" : "declining";

  return { ok: true, points, low, high, total: sum(points), totalLow: sum(low), totalHigh: sum(high), direction, changePerPeriod, basedOn: n };
}

export type TrendView = "daily" | "weekly" | "monthly";

export const TREND_VIEWS: Readonly<Record<TrendView, { readonly label: string; readonly periods: number; readonly caption: string }>> = {
  daily: { label: "Daily", periods: 30, caption: "Each day for the last 30 days" },
  weekly: { label: "Weekly", periods: 12, caption: "Each 7 days for the last 12 weeks" },
  monthly: { label: "Monthly", periods: 12, caption: "Each calendar month, this month so far" },
};

export function parseTrendView(value: string | undefined): TrendView {
  return value === "daily" || value === "monthly" ? value : "weekly";
}

export interface TrendSeries {
  readonly labels: readonly string[];
  readonly values: readonly number[];
}

/** The sales series for one view. `daily` must end on `endDay` and cover at least the view's range. */
export function buildTrend(view: TrendView, daily: readonly number[], endDay: string): TrendSeries {
  const { periods } = TREND_VIEWS[view];
  if (view === "daily") {
    return {
      labels: Array.from({ length: periods }, (_, index) => shortDayLabel(addDays(endDay, index - (periods - 1)))),
      values: daily.slice(-periods),
    };
  }
  if (view === "weekly") {
    return {
      // Each week is labelled by its first day.
      labels: Array.from({ length: periods }, (_, index) => shortDayLabel(addDays(endDay, -(periods - index) * DAYS_PER_WEEK + 1))),
      values: rollingWeeks(daily, periods),
    };
  }
  const rows = daily.map((value, index) => ({ day: addDays(endDay, index - (daily.length - 1)), value }));
  const months = calendarMonths(rows, endDay, periods);
  // Do not show a long empty run before the store's first sale; keep at least three months for context.
  const firstSale = months.findIndex((month) => month.value > 0);
  const start = Math.max(0, Math.min(firstSale === -1 ? months.length - 3 : firstSale, months.length - 3));
  const shown = months.slice(start);
  const endYear = endDay.slice(0, 4);
  const labels = shown.map((month, index) => {
    // Keep labels short: the year only appears for months outside the current year.
    const name = month.month.startsWith(endYear) ? monthLabel(month.month).split(" ")[0] : monthLabel(month.month);
    return index === shown.length - 1 ? `${name} so far` : name;
  });
  return { labels, values: shown.map((month) => month.value) };
}

/** Labels for the forecast periods that follow a weekly trend ending on `endDay`. */
export function forecastWeekLabels(endDay: string, horizon: number = FORECAST_WEEKS): string[] {
  return Array.from({ length: horizon }, (_, index) => shortDayLabel(addDays(endDay, index * DAYS_PER_WEEK + 1)));
}

/** Days until stock runs out at the recent selling rate. Null when nothing has sold recently. */
export function stockRunwayDays(stock: number, unitsSold: number, overDays: number): number | null {
  if (unitsSold <= 0 || overDays <= 0) return null;
  return Math.floor(stock / (unitsSold / overDays));
}
