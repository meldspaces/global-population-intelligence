import warehouseJson from "./warehouse.json";

export type Scale = "sequential" | "diverging";
export type Transform = "linear" | "sqrt";
export type ChartMode = "trend" | "overlay" | "scatter" | "bars";

export type Indicator = {
  code: string;
  short: string;
  name: string;
  unit: string;
  category: string;
  scale: Scale;
  transform: Transform;
  decimals: number;
  source: string;
  sourceUrl: string;
  citation: string;
};

export type Country = { iso3: string; name: string; mapped: boolean };
export type Point = [number, number];

type Warehouse = {
  compiledAt: string;
  scope: string;
  indicators: Indicator[];
  countries: Country[];
  series: Record<string, Record<string, Point[]>>;
};

const warehouse = warehouseJson as unknown as Warehouse;

/** UCDP's current-year file is a partial, preliminary count. */
const PRELIMINARY: Record<string, number[]> = {
  conflict_deaths: [2026],
};

export const COMPILED_AT = warehouse.compiledAt;
export const SCOPE = warehouse.scope;
export const INDICATORS: Indicator[] = warehouse.indicators;
export const COUNTRIES: Country[] = warehouse.countries;

const countryByIso = new Map(COUNTRIES.map((country) => [country.iso3, country]));

type SeriesIndex = {
  byIso: Map<string, Map<number, number>>;
  ordered: Map<string, Point[]>;
  yearCounts: Map<number, number>;
  points: number;
  countries: number;
  minYear: number;
  maxYear: number;
};

function indexSeries(raw: Record<string, Point[]> | undefined): SeriesIndex {
  const byIso = new Map<string, Map<number, number>>();
  const ordered = new Map<string, Point[]>();
  const yearCounts = new Map<number, number>();
  let points = 0;
  let minYear = Infinity;
  let maxYear = -Infinity;
  for (const [iso, pts] of Object.entries(raw ?? {})) {
    const map = new Map<number, number>();
    for (const [year, value] of pts) {
      map.set(year, value);
      yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
      points += 1;
      if (year < minYear) minYear = year;
      if (year > maxYear) maxYear = year;
    }
    byIso.set(iso, map);
    ordered.set(iso, pts);
  }
  return {
    byIso,
    ordered,
    yearCounts,
    points,
    countries: byIso.size,
    minYear: Number.isFinite(minYear) ? minYear : 0,
    maxYear: Number.isFinite(maxYear) ? maxYear : 0,
  };
}

const indexes: Record<string, SeriesIndex> = Object.fromEntries(
  INDICATORS.map((indicator) => [indicator.code, indexSeries(warehouse.series[indicator.code])]),
);

export type Coverage = {
  code: string;
  countries: number;
  points: number;
  minYear: number;
  maxYear: number;
};

export function indicatorByCode(code: string): Indicator {
  const found = INDICATORS.find((indicator) => indicator.code === code);
  if (!found) throw new Error(`Unknown indicator ${code}`);
  return found;
}

export function countryByCode(iso3: string): Country | undefined {
  return countryByIso.get(iso3);
}

export function isPreliminary(code: string, year: number): boolean {
  return (PRELIMINARY[code] ?? []).includes(year);
}

export function coverage(): Coverage[] {
  return INDICATORS.map((indicator) => {
    const index = indexes[indicator.code];
    return {
      code: indicator.code,
      countries: index.countries,
      points: index.points,
      minYear: index.minYear,
      maxYear: index.maxYear,
    };
  });
}

export function coverageFor(code: string): Coverage {
  const row = coverage().find((item) => item.code === code);
  if (!row) throw new Error(`Unknown indicator ${code}`);
  return row;
}

export function totalPoints(): number {
  return coverage().reduce((sum, row) => sum + row.points, 0);
}

export function valueAt(code: string, iso3: string, year: number): number | null {
  const value = indexes[code]?.byIso.get(iso3)?.get(year);
  return value === undefined ? null : value;
}

export function priorPoint(
  code: string,
  iso3: string,
  year: number,
): { year: number; value: number } | null {
  const pts = indexes[code]?.ordered.get(iso3);
  if (!pts) return null;
  let prior: { year: number; value: number } | null = null;
  for (const [y, value] of pts) {
    if (y >= year) break;
    prior = { year: y, value };
  }
  return prior;
}

export function countriesInYear(code: string, year: number): number {
  return indexes[code]?.yearCounts.get(year) ?? 0;
}

export function peakCountries(code: string): number {
  let peak = 0;
  for (const count of indexes[code]?.yearCounts.values() ?? []) {
    if (count > peak) peak = count;
  }
  return peak;
}

/** Latest year that still has broad country coverage, skipping preliminary years. */
export function defaultYear(code: string): number {
  const index = indexes[code];
  const peak = peakCountries(code);
  const threshold = peak * 0.75;
  let best: number | null = null;
  for (const [year, count] of index.yearCounts) {
    if (count < threshold || isPreliminary(code, year)) continue;
    if (best === null || year > best) best = year;
  }
  return best ?? index.maxYear;
}

export function searchCountries(query: string, limit = 6): Country[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(needle) || country.iso3.toLowerCase().includes(needle),
  ).slice(0, limit);
}

export type RankRow = {
  iso3: string;
  name: string;
  value: number;
  previous: { year: number; value: number } | null;
  yoy: number | null;
};

export function ranking(code: string, year: number): RankRow[] {
  const index = indexes[code];
  if (!index) return [];
  const rows: RankRow[] = [];
  for (const [iso3, values] of index.byIso) {
    if (!values.has(year)) continue;
    const value = values.get(year)!;
    const previous = priorPoint(code, iso3, year);
    const yoy =
      previous && previous.value !== 0 ? (value - previous.value) / Math.abs(previous.value) : null;
    rows.push({
      iso3,
      name: countryByIso.get(iso3)?.name ?? iso3,
      value,
      previous,
      yoy,
    });
  }
  rows.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  return rows;
}

export type YearSummary = {
  n: number;
  above: number;
  median: number | null;
  top: RankRow[];
};

export function yearSummary(code: string, year: number): YearSummary {
  const rows = ranking(code, year);
  const values = rows.map((row) => row.value).sort((a, b) => a - b);
  const median = values.length ? values[Math.floor((values.length - 1) / 2)] : null;
  const above = rows.reduce((count, row) => count + (row.value > 0 ? 1 : 0), 0);
  return { n: rows.length, above, median, top: rows.slice(0, 3) };
}

export function formatValue(value: number, indicator: Indicator): string {
  const body = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: indicator.decimals,
    maximumFractionDigits: indicator.decimals,
  });
  if (indicator.code === "gdp_per_capita") return `$${body}`;
  if (value < 0) return `−${body}`;
  if (indicator.scale === "diverging" && value > 0) return `+${body}`;
  return body;
}

export function formatWithUnit(value: number, indicator: Indicator): string {
  const formatted = formatValue(value, indicator);
  if (indicator.code === "gdp_per_capita") return formatted;
  return `${formatted} ${indicator.unit}`;
}

export function formatDelta(
  current: number,
  prior: { year: number; value: number } | null,
): string | null {
  if (!prior) return null;
  if (prior.value === 0) {
    return current === 0 ? `still 0 since ${prior.year}` : `up from 0 in ${prior.year}`;
  }
  const pct = ((current - prior.value) / Math.abs(prior.value)) * 100;
  if (!Number.isFinite(pct)) return null;
  const digits = Math.abs(pct) >= 100 ? 0 : 1;
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(digits)}% vs ${prior.year}`;
}

export function trendRows(code: string, isos: string[]): Array<Record<string, number | null> & { year: number }> {
  const years = new Set<number>();
  for (const iso of isos) {
    for (const [year] of indexes[code]?.ordered.get(iso) ?? []) years.add(year);
  }
  return [...years].sort((a, b) => a - b).map((year) => {
    const row: Record<string, number | null> & { year: number } = { year };
    for (const iso of isos) row[iso] = valueAt(code, iso, year);
    return row;
  });
}

export function overlayRows(iso3: string, left: string, right: string) {
  const years = new Set<number>();
  for (const [year] of indexes[left]?.ordered.get(iso3) ?? []) years.add(year);
  for (const [year] of indexes[right]?.ordered.get(iso3) ?? []) years.add(year);
  return [...years].sort((a, b) => a - b).map((year) => ({
    year,
    left: valueAt(left, iso3, year),
    right: valueAt(right, iso3, year),
  }));
}

export type ScatterPoint = { iso3: string; name: string; x: number; y: number };

export function scatterPoints(xCode: string, yCode: string, year: number): ScatterPoint[] {
  const points: ScatterPoint[] = [];
  for (const [iso3, values] of indexes[xCode]?.byIso ?? []) {
    if (!values.has(year)) continue;
    const y = valueAt(yCode, iso3, year);
    if (y === null) continue;
    points.push({
      iso3,
      name: countryByIso.get(iso3)?.name ?? iso3,
      x: values.get(year)!,
      y,
    });
  }
  return points;
}

export function pairedYears(iso3: string, xCode: string, yCode: string): ScatterPoint[] {
  const points: ScatterPoint[] = [];
  const name = countryByIso.get(iso3)?.name ?? iso3;
  for (const [year, x] of indexes[xCode]?.ordered.get(iso3) ?? []) {
    const y = valueAt(yCode, iso3, year);
    if (y === null) continue;
    points.push({ iso3, name: String(year), x, y });
  }
  return points;
}

export function pearson(points: { x: number; y: number }[]): { r: number; n: number } | null {
  const n = points.length;
  if (n < 8) return null;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const point of points) {
    sx += point.x;
    sy += point.y;
    sxx += point.x * point.x;
    syy += point.y * point.y;
    sxy += point.x * point.y;
  }
  const num = n * sxy - sx * sy;
  const den = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  if (!Number.isFinite(den) || den === 0) return null;
  return { r: num / den, n };
}

export type ColorStats = { low: number; high: number; min: number; max: number };

export function colorStats(values: number[], scale: Scale): ColorStats | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (scale === "diverging") {
    const edge = Math.max(Math.abs(at(0.05)), Math.abs(at(0.95)), 0.01);
    return { low: -edge, high: edge, min, max };
  }
  return { low: min, high: at(0.95), min, max };
}

const SEQ = ["#efe6d6", "#efc7a4", "#d46a32", "#7c3014"];
const DIV_NEG = "#3e5c73";
const DIV_MID = "#efe6d6";
const DIV_POS = "#b4532a";

function mix(a: string, b: string, t: number): string {
  const parse = (hex: string) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const from = parse(a);
  const to = parse(b);
  const clamped = Math.min(1, Math.max(0, t));
  const channels = from.map((channel, index) => Math.round(channel + (to[index] - channel) * clamped));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function sequential(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  if (clamped < 0.5) return mix(SEQ[0], SEQ[1], clamped / 0.5);
  if (clamped < 0.82) return mix(SEQ[1], SEQ[2], (clamped - 0.5) / 0.32);
  return mix(SEQ[2], SEQ[3], (clamped - 0.82) / 0.18);
}

export const NO_DATA = "#d9d2c6";
export const MAP_OCEAN = "#e7e1d4";
export const SERIES = ["#1c1915", "#b4532a", "#3e5c73", "#6b7c4a", "#8a6232"];

export function paintColor(value: number | null, stats: ColorStats | null, indicator: Indicator): string {
  if (value === null || !stats) return NO_DATA;
  if (indicator.scale === "diverging") {
    const t = Math.max(-1, Math.min(1, value / (stats.high || 1)));
    return t < 0 ? mix(DIV_NEG, DIV_MID, 1 + t) : mix(DIV_MID, DIV_POS, t);
  }
  const transform = (v: number) => (indicator.transform === "sqrt" ? Math.sqrt(Math.max(0, v)) : v);
  const low = transform(stats.low);
  const high = transform(Math.max(stats.high, stats.low));
  const t = high === low ? 0.5 : (transform(value) - low) / (high - low);
  return sequential(t);
}
