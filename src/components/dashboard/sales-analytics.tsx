import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { LineChart } from "@/components/charts/line-chart";
import type { PeriodComparison, SalesHistory, TopProduct } from "@/lib/data/analytics";
import {
  buildTrend,
  FORECAST_WEEKS,
  forecastWeekLabels,
  linearForecast,
  MIN_WEEKS_FOR_FORECAST,
  rollingWeeks,
  TREND_VIEWS,
  type Forecast,
  type TrendView,
} from "@/lib/domain/analytics";
import { formatMoney, roundToWholeUnits } from "@/lib/domain/money";

const CURRENCY = "INR";
const BRAND_BLUE = "#2152e5";
const FORECAST_HISTORY_WEEKS = 12;
const VIEW_ORDER: readonly TrendView[] = ["daily", "weekly", "monthly"];

const percent = (fraction: number): string => `${Math.abs(fraction * 100).toFixed(Math.abs(fraction) < 0.1 ? 1 : 0)}%`;

function ChangeChip({ change, against }: { change: number | null; against: string }) {
  if (change === null) return <p className="mt-2 text-[12.5px] text-subtle">No earlier period to compare</p>;
  const flat = Math.abs(change) < 0.005;
  const Icon = flat ? Minus : change > 0 ? TrendingUp : TrendingDown;
  const tone = flat ? "bg-muted text-subtle" : change > 0 ? "bg-ok-soft text-ok" : "bg-red-50 text-danger";
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-subtle">
      <span className={`num inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${tone}`}>
        <Icon size={13} aria-hidden="true" />
        {flat ? "No change" : `${change > 0 ? "Up" : "Down"} ${percent(change)}`}
      </span>
      {against}
    </p>
  );
}

function ComparisonTile({ label, value, comparison, against }: { label: string; value: string; comparison: PeriodComparison; against: string }) {
  return (
    <div className="panel p-5">
      <p className="label text-subtle">{label}</p>
      <p className="num mt-1.5 text-[1.65rem] font-bold leading-tight tracking-tight">{value}</p>
      <ChangeChip change={comparison.change} against={against} />
    </div>
  );
}

function trendSentence(forecast: Extract<Forecast, { ok: true }>): string {
  if (forecast.direction === "flat") return "Sales have been steady from week to week.";
  const verb = forecast.direction === "growing" ? "growing" : "falling";
  return `Sales have been ${verb} by about ${percent(forecast.changePerPeriod)} a week.`;
}

function ForecastPanel({ forecast }: { forecast: Forecast }) {
  return (
    <section className="panel flex flex-col p-5" aria-labelledby="forecast-heading">
      <h3 id="forecast-heading" className="text-[16px] font-bold tracking-tight">Forecast: next {FORECAST_WEEKS} weeks</h3>
      {forecast.ok ? (
        <>
          <p className="num mt-3 text-[1.9rem] font-bold leading-tight tracking-tight">{formatMoney(roundToWholeUnits(forecast.total), CURRENCY)}</p>
          <p className="num mt-1 text-[14px] text-subtle">
            Likely between {formatMoney(roundToWholeUnits(forecast.totalLow), CURRENCY)} and {formatMoney(roundToWholeUnits(forecast.totalHigh), CURRENCY)}
          </p>
          <p className="mt-4 flex items-start gap-2 text-[14.5px]">
            {forecast.direction === "declining" ? (
              <TrendingDown size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
            ) : forecast.direction === "growing" ? (
              <TrendingUp size={18} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
            ) : (
              <Minus size={18} className="mt-0.5 shrink-0 text-subtle" aria-hidden="true" />
            )}
            {trendSentence(forecast)}
          </p>
          <p className="mt-auto border-t border-line pt-3 text-[12.5px] leading-relaxed text-subtle">
            An estimate, not a promise. It extends the trend of the last {forecast.basedOn} weeks in a straight line and does not know about festivals, promotions or items going out of stock.
          </p>
        </>
      ) : (
        <p className="mt-3 text-[14.5px] leading-relaxed text-subtle">
          Not enough sales history yet. A forecast appears here after {MIN_WEEKS_FOR_FORECAST} weeks with sales.
        </p>
      )}
    </section>
  );
}

function TopProductsPanel({ products }: { products: readonly TopProduct[] }) {
  const top = Math.max(1, ...products.map((p) => p.salesMinor));
  return (
    <section className="panel p-5" aria-labelledby="top-products-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="top-products-heading" className="text-[16px] font-bold tracking-tight">Best sellers</h3>
        <p className="label text-subtle">Last 30 days</p>
      </div>
      {products.length === 0 ? (
        <p className="mt-3 text-[14.5px] text-subtle">No sales in the last 30 days.</p>
      ) : (
        <ol className="mt-4 space-y-3.5">
          {products.map((product) => (
            <li key={product.productId} title={`${product.name}: ${formatMoney(product.salesMinor, CURRENCY)} from ${product.units} units`} className="group">
              <div className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="truncate font-medium">{product.name}</span>
                <span className="num shrink-0 font-semibold">{formatMoney(product.salesMinor, CURRENCY)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="block h-2.5 flex-1 overflow-hidden rounded-r bg-muted" aria-hidden="true">
                  <span className="block h-full rounded-r bg-brand transition-opacity group-hover:opacity-80" style={{ width: `${Math.max(2, Math.round((product.salesMinor / top) * 100))}%` }} />
                </span>
                <span className="num w-16 shrink-0 text-right text-[12.5px] text-subtle">{product.units} {product.units === 1 ? "unit" : "units"}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

interface SalesAnalyticsProps {
  /** Page the view switch links back to, e.g. "/admin". */
  readonly basePath: string;
  readonly view: TrendView;
  readonly history: SalesHistory;
  readonly topProducts: readonly TopProduct[];
  /** What one sale is called here: "Orders" for the store, "Shipments" for a vendor. */
  readonly ordersLabel: string;
}

/** Sales trend, period comparisons, forecast and best sellers. Shared by the admin and vendor dashboards. */
export function SalesAnalytics({ basePath, view, history, topProducts, ordersLabel }: SalesAnalyticsProps) {
  const trend = buildTrend(view, history.dailySales, history.endDay);
  const forecast = linearForecast(rollingWeeks(history.dailySales, FORECAST_HISTORY_WEEKS));
  const chartForecast =
    view === "weekly" && forecast.ok
      ? {
          labels: forecastWeekLabels(history.endDay),
          points: forecast.points.map((value) => roundToWholeUnits(value)),
          low: forecast.low.map((value) => roundToWholeUnits(value)),
          high: forecast.high.map((value) => roundToWholeUnits(value)),
        }
      : undefined;

  return (
    <section className="mt-10" aria-labelledby="trends-heading">
      <h2 id="trends-heading" className="text-[18px] font-bold tracking-tight">Sales trends</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ComparisonTile label="Sales, last 30 days" value={formatMoney(history.sales30.current, CURRENCY)} comparison={history.sales30} against="vs the 30 days before" />
        <ComparisonTile label="Sales, last 7 days" value={formatMoney(history.sales7.current, CURRENCY)} comparison={history.sales7} against="vs the 7 days before" />
        <ComparisonTile label={`${ordersLabel}, last 30 days`} value={String(history.orders30.current)} comparison={history.orders30} against="vs the 30 days before" />
        <ComparisonTile label="Average order value" value={formatMoney(history.averageOrder30.current, CURRENCY)} comparison={history.averageOrder30} against="vs the 30 days before" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <section className="panel min-w-0 p-5" aria-labelledby="sales-chart-heading">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 id="sales-chart-heading" className="text-[16px] font-bold tracking-tight">Sales over time</h3>
              <p className="label mt-0.5 text-subtle">
                {TREND_VIEWS[view].caption}
                {chartForecast ? `, then a ${FORECAST_WEEKS}-week estimate` : ""}
              </p>
            </div>
            <nav aria-label="Chart period" className="flex gap-1 rounded-xl bg-muted p-1">
              {VIEW_ORDER.map((option) => (
                <Link
                  key={option}
                  href={option === "weekly" ? basePath : `${basePath}?view=${option}`}
                  scroll={false}
                  aria-current={option === view ? "page" : undefined}
                  className={`rounded-lg px-3 py-1.5 text-[13.5px] font-semibold transition-colors ${option === view ? "bg-white text-fg shadow-sm" : "text-subtle hover:text-fg"}`}
                >
                  {TREND_VIEWS[option].label}
                </Link>
              ))}
            </nav>
          </div>
          <LineChart
            title={`Sales over time. ${TREND_VIEWS[view].caption}.`}
            labels={trend.labels}
            series={[{ name: "Sales", color: BRAND_BLUE, values: trend.values }]}
            forecast={chartForecast}
            currency={CURRENCY}
          />
        </section>

        <div className="grid gap-4">
          <ForecastPanel forecast={forecast} />
        </div>
      </div>

      <div className="mt-4">
        <TopProductsPanel products={topProducts} />
      </div>
    </section>
  );
}
