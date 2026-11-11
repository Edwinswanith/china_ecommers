import { LineChart, type ChartSeries } from "@/components/charts/line-chart";
import type { FulfilmentSpeed, VendorDailySales } from "@/lib/data/analytics";
import { addDays, DAYS_PER_WEEK, rollingWeeks, shortDayLabel } from "@/lib/domain/analytics";

const CURRENCY = "INR";
const WEEKS = 12;
/** Validated categorical colours, always assigned in this order. Vendors beyond these are grouped. */
const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a"] as const;
const OTHER_COLOR = "#8b94a3";

function toSeries(vendors: readonly VendorDailySales[]): ChartSeries[] {
  const named = vendors.slice(0, SERIES_COLORS.length).map((vendor, index) => ({
    name: vendor.name,
    color: SERIES_COLORS[index],
    values: rollingWeeks(vendor.dailySales, WEEKS),
  }));
  const rest = vendors.slice(SERIES_COLORS.length);
  if (rest.length === 0) return named;
  const others = rest.map((vendor) => rollingWeeks(vendor.dailySales, WEEKS));
  const combined = Array.from({ length: WEEKS }, (_, week) => others.reduce((total, weeks) => total + weeks[week], 0));
  return [...named, { name: `${rest.length} other ${rest.length === 1 ? "vendor" : "vendors"}`, color: OTHER_COLOR, values: combined }];
}

export function VendorTrendPanel({ vendors, endDay }: { vendors: readonly VendorDailySales[]; endDay: string }) {
  const labels = Array.from({ length: WEEKS }, (_, index) => shortDayLabel(addDays(endDay, -(WEEKS - index) * DAYS_PER_WEEK + 1)));
  return (
    <section className="panel min-w-0 p-5" aria-labelledby="vendor-trend-heading">
      <h3 id="vendor-trend-heading" className="text-[16px] font-bold tracking-tight">Weekly sales by vendor</h3>
      <p className="label mb-4 mt-0.5 text-subtle">Each 7 days for the last 12 weeks</p>
      {vendors.length === 0 ? (
        <p className="text-[14.5px] text-subtle">No sales in the last 12 weeks.</p>
      ) : (
        <LineChart title="Weekly sales by vendor for the last 12 weeks" labels={labels} series={toSeries(vendors)} currency={CURRENCY} height={280} />
      )}
    </section>
  );
}

const hours = (value: number | null): string => {
  if (value === null) return "—";
  return value < 48 ? `${Math.round(value)} hours` : `${(value / 24).toFixed(1)} days`;
};

export function FulfilmentSpeedPanel({ rows }: { rows: readonly FulfilmentSpeed[] }) {
  return (
    <section className="panel" aria-labelledby="speed-heading">
      <div className="border-b border-line px-5 py-4">
        <h3 id="speed-heading" className="text-[16px] font-bold tracking-tight">Fulfilment speed</h3>
        <p className="label mt-0.5 text-subtle">Average over the last 90 days, slowest first</p>
      </div>
      {rows.length === 0 ? (
        <p className="p-5 text-[14.5px] text-subtle">Nothing has shipped yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th className="text-right">Order to shipped</th>
                <th className="text-right">Order to delivered</th>
                <th className="text-right">Shipped</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.vendorId}>
                  <td className="font-medium">{row.name}</td>
                  <td className="num text-right">{hours(row.hoursToShip)}</td>
                  <td className="num text-right">{row.daysToDeliver === null ? "—" : `${row.daysToDeliver.toFixed(1)} days`}</td>
                  <td className="num text-right">{row.shippedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
