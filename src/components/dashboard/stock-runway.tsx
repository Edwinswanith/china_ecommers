import { TriangleAlert } from "lucide-react";
import type { StockRunway } from "@/lib/data/analytics";

const URGENT_DAYS = 14;

/** Which products will sell out soonest if they keep selling at the last 30 days' rate. */
export function StockRunwayPanel({ rows }: { rows: readonly StockRunway[] }) {
  return (
    <section className="panel" aria-labelledby="runway-heading">
      <div className="border-b border-line px-5 py-4">
        <h3 id="runway-heading" className="text-[16px] font-bold tracking-tight">Stock running out soonest</h3>
        <p className="label mt-0.5 text-subtle">If each product keeps selling at its last 30 days&apos; rate</p>
      </div>
      {rows.length === 0 ? (
        <p className="p-5 text-[14.5px] text-subtle">Nothing has sold in the last 30 days, so there is no selling rate to go on yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="text-right">In stock</th>
                <th className="text-right">Sold in 30 days</th>
                <th className="text-right">Estimated to last</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.productId}>
                  <td className="font-medium">{row.name}</td>
                  <td className="num text-right">{row.stock}</td>
                  <td className="num text-right">{row.unitsSold}</td>
                  <td className="num text-right">
                    {row.daysLeft <= URGENT_DAYS ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-amber-700">
                        <TriangleAlert size={15} aria-hidden="true" /> {row.daysLeft} days · restock soon
                      </span>
                    ) : (
                      `${row.daysLeft} days`
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
