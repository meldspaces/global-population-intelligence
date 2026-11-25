import {
  countryByCode,
  formatValue,
  formatWithUnit,
  indicatorByCode,
  isPreliminary,
  priorPoint,
  valueAt,
  yearSummary,
  type Indicator,
} from "./model";

export type Spot = {
  code: string;
  year: number;
  label: string;
  focus?: string;
};

/**
 * News framing only. Numbers are never stored here — `spotText` computes them
 * from the warehouse so a data refresh cannot leave a stale statistic.
 * The autopilot may edit this object: headline, news, and which spots to show.
 */
export const FEATURED = {
  asOf: "2026-11-25",
  kicker: "Public interest",
  headline: "Climate talks stalled. The wars in the headlines are where battle deaths concentrate.",
  news: "On 25 Nov 2026, coverage clusters on the COP31 deadlock in Antalya and on fighting in Sudan, Yemen, and Ukraine. Headlines are not causes. Every figure in this strip is calculated from the warehouse.",
  spots: [
    { code: "temperature_anomaly", year: 2024, label: "2024 temperature" },
    { code: "temperature_anomaly", year: 2025, label: "2025 temperature" },
    { code: "conflict_deaths", year: 2025, label: "2025 conflict", focus: "UKR" },
    { code: "conflict_deaths", year: 2026, label: "2026 conflict, preliminary", focus: "YEM" },
  ] as Spot[],
};

function topList(code: string, year: number, indicator: Indicator): string {
  const summary = yearSummary(code, year);
  if (!summary.top.length) return `No ${indicator.short.toLowerCase()} rows in ${year}.`;
  return summary.top
    .map((row) => `${row.name} ${formatWithUnit(row.value, indicator)}`)
    .join(", ");
}

export function spotText(spot: Spot): string {
  const indicator = indicatorByCode(spot.code);
  const summary = yearSummary(spot.code, spot.year);
  if (!summary.n) return `No ${indicator.name.toLowerCase()} rows in ${spot.year}.`;

  if (indicator.code === "temperature_anomaly" && summary.median !== null) {
    return `In ${spot.year}, ${summary.above} of ${summary.n} countries were warmer than their 1991–2020 average. Median anomaly ${formatValue(summary.median, indicator)} ${indicator.unit}.`;
  }

  if (indicator.code === "conflict_deaths") {
    const focus = spot.focus ? countryByCode(spot.focus) : undefined;
    const focusValue = spot.focus ? valueAt(spot.code, spot.focus, spot.year) : null;
    const prior =
      spot.focus && focusValue !== null ? priorPoint(spot.code, spot.focus, spot.year) : null;
    const focusBit =
      focus && focusValue !== null
        ? ` ${focus.name} ${formatWithUnit(focusValue, indicator)}${
            prior ? ` (prior ${formatWithUnit(prior.value, indicator)} in ${prior.year})` : ""
          }.`
        : "";
    const prelim = isPreliminary(spot.code, spot.year)
      ? " Preliminary partial-year count, not a finished total."
      : "";
    return `In ${spot.year}, highest battle-death tolls: ${topList(spot.code, spot.year, indicator)}.${focusBit}${prelim}`;
  }

  return `In ${spot.year}, ${summary.n} countries report ${indicator.name.toLowerCase()}. Highest: ${topList(spot.code, spot.year, indicator)}.`;
}
