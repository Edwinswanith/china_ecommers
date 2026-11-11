"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { compactMoney, niceCeiling } from "./scale";
import { formatMoney } from "@/lib/domain/money";

export interface ChartSeries {
  readonly name: string;
  readonly color: string;
  /** One value per label, in minor units. */
  readonly values: readonly number[];
}

export interface ChartForecast {
  readonly labels: readonly string[];
  readonly points: readonly number[];
  readonly low: readonly number[];
  readonly high: readonly number[];
}

interface LineChartProps {
  /** Describes the chart for screen readers, e.g. "Weekly sales for the last 12 weeks". */
  readonly title: string;
  readonly labels: readonly string[];
  readonly series: readonly ChartSeries[];
  /** Continues the first series as a dashed estimate with a shaded likely range. */
  readonly forecast?: ChartForecast;
  readonly currency: string;
  readonly height?: number;
}

const MARGIN = { top: 16, right: 18, bottom: 30, left: 54 } as const;
const GRID_STEPS = 4;
/** Room each x-axis label needs, so labels thin out on narrow screens instead of overlapping. */
const X_LABEL_WIDTH = 72;
const DEFAULT_WIDTH = 720;
const GRID = "#e4e8ee";
const AXIS_TEXT = "#5b6577";
const SURFACE = "#ffffff";
/** The lines take about a second to draw; the dots, fill and forecast follow once they have arrived. */
const AFTER_DRAW = { "--fade-delay": "1s" } as CSSProperties;

function linePath(points: ReadonlyArray<readonly [number, number]>): string {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

export function LineChart({ title, labels, series, forecast, currency, height = 300 }: LineChartProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [active, setActive] = useState<number | null>(null);
  const [onScreen, setOnScreen] = useState(false);
  const descriptionId = useId();

  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Hold the draw-in animation until the chart has scrolled into view, so it is actually seen.
  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setOnScreen(true);
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const allLabels = useMemo(() => [...labels, ...(forecast?.labels ?? [])], [labels, forecast]);
  const historyCount = labels.length;
  const count = allLabels.length;
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const top = niceCeiling(Math.max(1, ...series.flatMap((s) => s.values), ...(forecast?.high ?? [])));

  const x = (index: number): number => MARGIN.left + (count <= 1 ? plotWidth / 2 : (index / (count - 1)) * plotWidth);
  const y = (value: number): number => MARGIN.top + plotHeight - (value / top) * plotHeight;
  const baseline = y(0);

  const labelEvery = Math.max(1, Math.ceil(count / Math.max(2, Math.floor(plotWidth / X_LABEL_WIDTH))));
  const showLabel = (index: number): boolean => (count - 1 - index) % labelEvery === 0;

  const primary = series[0];
  // Changes when a different period is shown, so the lines draw in again for the new data.
  const drawKey = `${labels.length}-${labels[0] ?? ""}`;
  const lastActual = historyCount - 1;
  const forecastLine = forecast && primary
    ? linePath([[x(lastActual), y(primary.values[lastActual])], ...forecast.points.map((value, i) => [x(historyCount + i), y(value)] as const)])
    : null;
  const forecastBand = forecast && primary
    ? `${linePath([[x(lastActual), y(primary.values[lastActual])], ...forecast.high.map((value, i) => [x(historyCount + i), y(value)] as const)])} ${[...forecast.low]
        .map((value, i) => [x(historyCount + i), y(value)] as const)
        .reverse()
        .map(([px, py]) => `L${px.toFixed(1)},${py.toFixed(1)}`)
        .join(" ")} L${x(lastActual).toFixed(1)},${y(primary.values[lastActual]).toFixed(1)} Z`
    : null;

  const nearestIndex = (clientX: number, target: Element): number => {
    const bounds = target.getBoundingClientRect();
    const ratio = (clientX - bounds.left - MARGIN.left) / plotWidth;
    return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));
  };
  const onMove = (event: PointerEvent<SVGSVGElement>): void => setActive(nearestIndex(event.clientX, event.currentTarget));
  const onKey = (event: KeyboardEvent<SVGSVGElement>): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = event.key === "ArrowLeft" ? -1 : 1;
    setActive((current) => Math.min(count - 1, Math.max(0, (current ?? count - 1) + step)));
  };

  const activeIsForecast = active !== null && active >= historyCount;
  const tooltipLeft = active === null ? 0 : Math.min(Math.max(x(active), 96), width - 96);
  const money = (value: number): string => formatMoney(value, currency);

  return (
    <div ref={wrapper} className={`relative ${onScreen ? "" : "chart-waiting"}`}>
      {series.length > 1 ? (
        <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-subtle">
          {series.map((s) => (
            <li key={s.name} className="flex items-center gap-2">
              <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} aria-hidden="true" />
              {s.name}
            </li>
          ))}
        </ul>
      ) : null}

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={title}
        aria-describedby={descriptionId}
        tabIndex={0}
        className="block max-w-full touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        onPointerMove={onMove}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((current) => current ?? lastActual)}
        onBlur={() => setActive(null)}
        onKeyDown={onKey}
      >
        {Array.from({ length: GRID_STEPS + 1 }, (_, step) => {
          const value = (top / GRID_STEPS) * step;
          return (
            <g key={step}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(value)} y2={y(value)} stroke={GRID} strokeWidth={1} />
              <text x={MARGIN.left - 8} y={y(value) + 4} textAnchor="end" fontSize={11.5} fill={AXIS_TEXT} className="num">
                {compactMoney(value, currency)}
              </text>
            </g>
          );
        })}

        {allLabels.map((label, index) =>
          showLabel(index) ? (
            <text key={`${label}-${index}`} x={x(index)} y={height - 8} textAnchor={index === count - 1 ? "end" : "middle"} fontSize={11.5} fill={AXIS_TEXT}>
              {label}
            </text>
          ) : null,
        )}

        {forecast && forecastBand && forecastLine && primary ? (
          <g key={`forecast-${drawKey}`} className="fade-in" style={AFTER_DRAW}>
            <path d={forecastBand} fill={primary.color} opacity={0.1} />
            <path d={forecastLine} fill="none" stroke={primary.color} strokeWidth={2} strokeDasharray="5 5" strokeLinecap="round" />
            <line x1={x(lastActual)} x2={x(lastActual)} y1={MARGIN.top} y2={baseline} stroke={GRID} strokeWidth={1} />
            <text x={x(lastActual) + 8} y={MARGIN.top + 10} fontSize={11.5} fontWeight={600} fill={AXIS_TEXT}>
              Forecast
            </text>
          </g>
        ) : null}

        {series.map((s, seriesIndex) => {
          const points = s.values.map((value, index) => [x(index), y(value)] as const);
          const end = points[points.length - 1];
          return (
            <g key={`${s.name}-${drawKey}`}>
              {seriesIndex === 0 && series.length === 1 && points.length > 1 ? (
                <path d={`${linePath(points)} L${end[0].toFixed(1)},${baseline} L${points[0][0].toFixed(1)},${baseline} Z`} fill={s.color} opacity={0.1} className="fade-in" style={{ "--fade-delay": "0.5s" } as CSSProperties} />
              ) : null}
              <path d={linePath(points)} pathLength={1} className="draw-in" fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {end ? <circle cx={end[0]} cy={end[1]} r={4.5} fill={s.color} stroke={SURFACE} strokeWidth={2} className="fade-in" style={AFTER_DRAW} /> : null}
            </g>
          );
        })}

        {active !== null ? (
          <g pointerEvents="none">
            <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={baseline} stroke="#9aa3b2" strokeWidth={1} />
            {activeIsForecast && forecast && primary ? (
              <circle cx={x(active)} cy={y(forecast.points[active - historyCount])} r={4.5} fill={SURFACE} stroke={primary.color} strokeWidth={2} />
            ) : (
              series.map((s) => <circle key={s.name} cx={x(active)} cy={y(s.values[active])} r={4.5} fill={s.color} stroke={SURFACE} strokeWidth={2} />)
            )}
          </g>
        ) : null}
      </svg>

      {active !== null ? (
        <div
          className="pointer-events-none absolute top-1 z-10 w-max max-w-[220px] -translate-x-1/2 rounded-xl border border-line bg-white px-3 py-2 text-[13px] shadow-[var(--shadow-lift)]"
          style={{ left: tooltipLeft }}
          role="status"
        >
          <p className="text-[12px] font-medium text-subtle">{activeIsForecast ? `Week from ${allLabels[active]} · estimate` : allLabels[active]}</p>
          {activeIsForecast && forecast ? (
            <>
              <p className="num mt-0.5 text-[15px] font-bold">{money(forecast.points[active - historyCount])}</p>
              <p className="num text-[12px] text-subtle">
                Likely {money(forecast.low[active - historyCount])} to {money(forecast.high[active - historyCount])}
              </p>
            </>
          ) : (
            <ul className="mt-0.5 space-y-0.5">
              {series.map((s) => (
                <li key={s.name} className="flex items-center gap-2">
                  {series.length > 1 ? <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden="true" /> : null}
                  <span className="num font-bold">{money(s.values[active])}</span>
                  {series.length > 1 ? <span className="truncate text-subtle">{s.name}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <p id={descriptionId} className="sr-only">
        Use the left and right arrow keys to read each value. The same figures are in the table below the chart.
      </p>

      <details className="mt-3 text-[13.5px]">
        <summary className="link w-max cursor-pointer text-[13.5px]">Show these figures as a table</summary>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                {series.map((s) => (
                  <th key={s.name} className="text-right">{series.length > 1 ? s.name : "Sales"}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((label, index) => (
                <tr key={`${label}-${index}`}>
                  <td>{label}</td>
                  {series.map((s) => (
                    <td key={s.name} className="num text-right">{money(s.values[index])}</td>
                  ))}
                </tr>
              ))}
              {forecast?.labels.map((label, index) => (
                <tr key={`forecast-${label}`}>
                  <td>{label} (estimate)</td>
                  <td className="num text-right" colSpan={series.length}>
                    {money(forecast.points[index])} · likely {money(forecast.low[index])} to {money(forecast.high[index])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
