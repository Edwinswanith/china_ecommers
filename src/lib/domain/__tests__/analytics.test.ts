import { describe, expect, it } from "vitest";
import {
  addDays,
  buildTrend,
  calendarMonths,
  dayKeyOf,
  fillDaily,
  forecastWeekLabels,
  linearForecast,
  parseTrendView,
  percentChange,
  rollingWeeks,
  shortDayLabel,
  stockRunwayDays,
  sumWindow,
} from "../analytics";

describe("day keys", () => {
  it("uses the store's time zone, not UTC", () => {
    // 20:00 UTC on 4 Nov is already 01:30 on 5 Nov in India.
    expect(dayKeyOf(new Date("2026-11-04T20:00:00Z"))).toBe("2026-11-05");
    expect(dayKeyOf(new Date("2026-11-04T10:00:00Z"))).toBe("2026-11-04");
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(shortDayLabel("2026-11-05")).toBe("5 Nov");
  });
});

describe("fillDaily", () => {
  it("returns one value per day, oldest first, with zero for missing days", () => {
    const rows = [
      { day: "2026-11-03", value: 500 },
      { day: "2026-11-05", value: 200 },
      { day: "2026-11-05", value: 100 },
      { day: "2026-10-01", value: 999 },
    ];
    expect(fillDaily(rows, "2026-11-05", 4)).toEqual([0, 500, 0, 300]);
  });
});

describe("windows", () => {
  const daily = Array.from({ length: 21 }, (_, index) => index + 1); // 1..21

  it("sums the most recent days, with an optional offset", () => {
    expect(sumWindow(daily, 7)).toBe(15 + 16 + 17 + 18 + 19 + 20 + 21);
    expect(sumWindow(daily, 7, 7)).toBe(8 + 9 + 10 + 11 + 12 + 13 + 14);
    expect(sumWindow(daily, 7, 21)).toBe(0);
  });

  it("builds complete rolling weeks ending on the last day", () => {
    expect(rollingWeeks(daily, 3)).toEqual([28, 77, 126]);
  });

  it("returns zero for weeks before the data starts", () => {
    expect(rollingWeeks([5, 5], 2)).toEqual([0, 10]);
  });
});

describe("calendarMonths", () => {
  it("totals by calendar month and includes empty months", () => {
    const rows = [
      { day: "2026-09-30", value: 10 },
      { day: "2026-11-01", value: 4 },
      { day: "2026-11-05", value: 6 },
    ];
    expect(calendarMonths(rows, "2026-11-05", 3)).toEqual([
      { month: "2026-09", value: 10 },
      { month: "2026-10", value: 0 },
      { month: "2026-11", value: 10 },
    ]);
  });

  it("crosses a year boundary", () => {
    expect(calendarMonths([], "2027-01-15", 2).map((m) => m.month)).toEqual(["2026-12", "2027-01"]);
  });
});

describe("percentChange", () => {
  it("returns the fractional change", () => {
    expect(percentChange(118, 100)).toBeCloseTo(0.18);
    expect(percentChange(50, 100)).toBeCloseTo(-0.5);
  });

  it("returns null when there is no earlier figure to compare with", () => {
    expect(percentChange(100, 0)).toBeNull();
  });
});

describe("linearForecast", () => {
  it("continues a perfectly straight trend exactly", () => {
    const forecast = linearForecast([100, 200, 300, 400, 500], 3);
    expect(forecast.ok).toBe(true);
    if (!forecast.ok) return;
    expect(forecast.points).toEqual([600, 700, 800]);
    expect(forecast.low).toEqual([600, 700, 800]);
    expect(forecast.high).toEqual([600, 700, 800]);
    expect(forecast.total).toBe(2100);
    expect(forecast.direction).toBe("growing");
    expect(forecast.basedOn).toBe(5);
  });

  it("gives a range around a noisy trend, with the estimate inside it", () => {
    const forecast = linearForecast([100, 140, 110, 170, 150, 200], 4);
    expect(forecast.ok).toBe(true);
    if (!forecast.ok) return;
    forecast.points.forEach((point, index) => {
      expect(forecast.low[index]).toBeLessThan(point);
      expect(forecast.high[index]).toBeGreaterThan(point);
    });
    expect(forecast.totalLow).toBeLessThan(forecast.total);
    expect(forecast.totalHigh).toBeGreaterThan(forecast.total);
  });

  it("recognises flat and declining sales", () => {
    const flat = linearForecast([500, 500, 500, 500, 500]);
    const declining = linearForecast([500, 400, 300, 200, 100]);
    expect(flat.ok && flat.direction).toBe("flat");
    expect(declining.ok && declining.direction).toBe("declining");
  });

  it("never projects negative sales", () => {
    const forecast = linearForecast([400, 300, 200, 100], 4);
    expect(forecast.ok).toBe(true);
    if (!forecast.ok) return;
    expect(Math.min(...forecast.points, ...forecast.low)).toBe(0);
  });

  it("refuses to forecast from too little history", () => {
    expect(linearForecast([100, 200, 300])).toEqual({ ok: false, reason: "not-enough-data" });
    expect(linearForecast([])).toEqual({ ok: false, reason: "not-enough-data" });
  });

  it("ignores empty weeks before the first sale, and needs four selling weeks", () => {
    expect(linearForecast([0, 0, 0, 0, 0, 0, 100, 200, 300]).ok).toBe(false);
    const forecast = linearForecast([0, 0, 0, 100, 200, 300, 400], 1);
    expect(forecast.ok && forecast.points).toEqual([500]);
    expect(linearForecast([100, 0, 0, 200, 0, 0, 300]).ok).toBe(false);
  });
});

describe("buildTrend", () => {
  const endDay = "2026-11-11";
  const daily = Array.from({ length: 365 }, () => 100);

  it("daily view shows the last 30 days", () => {
    const trend = buildTrend("daily", daily, endDay);
    expect(trend.values).toHaveLength(30);
    expect(trend.labels[0]).toBe("13 Oct");
    expect(trend.labels[29]).toBe("11 Nov");
  });

  it("weekly view shows 12 complete weeks labelled by their first day", () => {
    const trend = buildTrend("weekly", daily, endDay);
    expect(trend.values).toEqual(Array.from({ length: 12 }, () => 700));
    expect(trend.labels[11]).toBe("5 Nov");
    expect(trend.labels[10]).toBe("29 Oct");
  });

  it("forecast weeks follow straight on from the weekly view", () => {
    expect(forecastWeekLabels(endDay, 2)).toEqual(["12 Nov", "19 Nov"]);
  });

  it("monthly view trims the empty months before the first sale but keeps three", () => {
    const recent = Array.from({ length: 365 }, (_, index) => (index >= 365 - 20 ? 100 : 0));
    const trend = buildTrend("monthly", recent, endDay);
    expect(trend.labels).toEqual(["Sep", "Oct", "Nov so far"]);
    expect(trend.values).toEqual([0, 900, 1100]);
  });

  it("monthly view shows the year for months in an earlier year", () => {
    const trend = buildTrend("monthly", daily, "2027-01-20");
    expect(trend.labels.slice(-3)).toEqual(["Nov 2026", "Dec 2026", "Jan so far"]);
  });
});

describe("parseTrendView", () => {
  it("defaults to weekly for anything unexpected", () => {
    expect(parseTrendView("daily")).toBe("daily");
    expect(parseTrendView("monthly")).toBe("monthly");
    expect(parseTrendView(undefined)).toBe("weekly");
    expect(parseTrendView("yearly")).toBe("weekly");
  });
});

describe("stockRunwayDays", () => {
  it("estimates days of stock left at the recent selling rate", () => {
    expect(stockRunwayDays(40, 60, 30)).toBe(20);
  });

  it("returns null when nothing has sold", () => {
    expect(stockRunwayDays(40, 0, 30)).toBeNull();
  });
});
