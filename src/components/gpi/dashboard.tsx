import { useEffect, useMemo, useState, type ComponentType } from "react";
import type { MapViewProps } from "@/components/gpi/map-view";
import { StatusBar } from "@/components/gpi/status-bar";
import type { TrendChartProps } from "@/components/gpi/trend-chart";
import { FEATURED, spotText, type Spot } from "@/lib/gpi/featured";
import {
  coverageFor,
  countryByCode,
  countriesInYear,
  defaultYear,
  formatDelta,
  formatWithUnit,
  indicatorByCode,
  INDICATORS,
  isPreliminary,
  peakCountries,
  ranking,
  searchCountries,
  type ChartMode,
} from "@/lib/gpi/model";

const MODES: { id: ChartMode; label: string }[] = [
  { id: "trend", label: "Trend" },
  { id: "overlay", label: "Overlay" },
  { id: "scatter", label: "Scatter" },
  { id: "bars", label: "Rank" },
];

const START = "homicide_rate_per_100k";

export function Dashboard() {
  const [code, setCode] = useState(START);
  const [year, setYear] = useState(() => defaultYear(START));
  const [focus, setFocus] = useState("USA");
  const [pins, setPins] = useState<string[]>([]);
  const [compare, setCompare] = useState<string | null>("alcohol_per_capita");
  const [mode, setMode] = useState<ChartMode>("trend");
  const [log, setLog] = useState(false);
  const [query, setQuery] = useState("");
  const [MapView, setMapView] = useState<ComponentType<MapViewProps> | null>(null);
  const [Chart, setChart] = useState<ComponentType<TrendChartProps> | null>(null);

  const indicator = indicatorByCode(code);
  const yearBounds = coverageFor(code);
  const matches = searchCountries(query);
  const focusCountry = countryByCode(focus);
  const rows = useMemo(() => ranking(code, year), [code, year]);
  const focusRank = rows.findIndex((row) => row.iso3 === focus);
  const tableRows = useMemo(() => {
    const top = rows.slice(0, 8);
    if (focusRank >= 8) top.unshift(rows[focusRank]);
    return top;
  }, [rows, focusRank]);
  const reporting = countriesInYear(code, year);
  const sparse = reporting < peakCountries(code) * 0.4;
  const broadYear = defaultYear(code);
  const logAllowed = mode === "trend" || mode === "bars";
  const clampedYear = Math.min(yearBounds.maxYear, Math.max(yearBounds.minYear, year));

  useEffect(() => {
    let live = true;
    void import("@/components/gpi/map-view").then((mod) => {
      if (live) setMapView(() => mod.MapView);
    });
    void import("@/components/gpi/trend-chart").then((mod) => {
      if (live) setChart(() => mod.TrendChart);
    });
    return () => {
      live = false;
    };
  }, []);

  function selectIndicator(next: string) {
    const bounds = coverageFor(next);
    setCode(next);
    setYear((current) => Math.min(bounds.maxYear, Math.max(bounds.minYear, current)));
    if (compare === next) {
      setCompare(INDICATORS.find((item) => item.code !== next)?.code ?? null);
    }
  }

  function selectCountry(iso3: string) {
    setFocus(iso3);
    setQuery("");
  }

  function jump(spot: Spot) {
    const bounds = coverageFor(spot.code);
    setCode(spot.code);
    setYear(Math.min(bounds.maxYear, Math.max(bounds.minYear, spot.year)));
    if (spot.focus) setFocus(spot.focus);
    setMode("bars");
  }

  function pinFocus() {
    setPins((current) => (current.includes(focus) ? current : [...current, focus].slice(-4)));
  }

  return (
    <div className="shell">
      <header className="masthead">
        <p className="kicker">Country-year warehouse · 1930–2026</p>
        <h1>Global Population Intelligence</h1>
        <p className="lede">
          Homicide, diet, alcohol, battle deaths, income, and temperature on one map. Aggregate public series only. A correlation here is not a cause.
        </p>
      </header>

      <section className="featured" aria-label="Public interest">
        <p className="kicker">
          {FEATURED.kicker} · {FEATURED.asOf}
        </p>
        <h2>{FEATURED.headline}</h2>
        <p>{FEATURED.news}</p>
        <div className="spot-grid">
          {FEATURED.spots.map((spot) => (
            <button
              key={`${spot.code}-${spot.year}-${spot.focus ?? "all"}`}
              type="button"
              className="spot"
              onClick={() => jump(spot)}
            >
              <span className="spot-label">{spot.label}</span>
              <span>{spotText(spot)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="toolbar" aria-label="Series and year">
        <div className="chip-row" role="group" aria-label="Indicator">
          {INDICATORS.map((item) => (
            <button
              key={item.code}
              type="button"
              className="chip"
              aria-pressed={item.code === code}
              onClick={() => selectIndicator(item.code)}
            >
              {item.short}
            </button>
          ))}
        </div>
        <label className="year-control">
          <span>
            Year {clampedYear}
            {isPreliminary(code, clampedYear) ? " · preliminary" : ""}
          </span>
          <input
            type="range"
            min={yearBounds.minYear}
            max={yearBounds.maxYear}
            value={clampedYear}
            onChange={(event) => setYear(Number(event.target.value))}
          />
        </label>
        {sparse && (
          <button type="button" className="text-button" onClick={() => setYear(broadYear)}>
            Most complete year: {broadYear}
          </button>
        )}
      </section>

      <div className="stage">
        <section className="panel" aria-label="Map">
          <div className="panel-head">
            <h2>Map</h2>
            <p>
              {indicator.name}, {clampedYear}
            </p>
          </div>
          <label className="finder">
            <span>Country</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={focusCountry?.name ?? "Find a country"}
              role="combobox"
              aria-expanded={matches.length > 0}
              aria-controls="country-matches"
            />
          </label>
          {matches.length > 0 && (
            <ul id="country-matches" className="matches">
              {matches.map((country) => (
                <li key={country.iso3}>
                  <button type="button" onClick={() => selectCountry(country.iso3)}>
                    {country.name}
                    <span>{country.iso3}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {MapView ? (
            <MapView code={code} year={clampedYear} focus={focus} onSelect={selectCountry} />
          ) : (
            <div className="map-frame">
              <p className="map-fallback">
                Preparing the map for {indicator.short}, {clampedYear}.
              </p>
            </div>
          )}
        </section>

        <section className="panel" aria-label="Chart">
          <div className="panel-head">
            <h2>Chart</h2>
            <p>{focusCountry?.name ?? focus}</p>
          </div>
          <div className="chart-tools">
            <div className="chip-row" role="group" aria-label="Chart type">
              {MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="chip"
                  aria-pressed={mode === item.id}
                  onClick={() => setMode(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className="compare">
              Compare
              <select value={compare ?? ""} onChange={(event) => setCompare(event.target.value || null)}>
                <option value="">None</option>
                {INDICATORS.filter((item) => item.code !== code).map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="text-button" onClick={pinFocus} disabled={pins.includes(focus)}>
              Pin {focusCountry?.name ?? "country"}
            </button>
            <button
              type="button"
              className="text-button"
              aria-pressed={log}
              disabled={!logAllowed}
              onClick={() => setLog((current) => !current)}
            >
              Log scale
            </button>
          </div>
          {pins.length > 0 && (
            <ul className="pins">
              {pins.map((iso) => (
                <li key={iso}>
                  <button type="button" onClick={() => setPins((current) => current.filter((item) => item !== iso))}>
                    {countryByCode(iso)?.name ?? iso} ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          {Chart ? (
            <Chart
              mode={mode}
              code={code}
              compare={compare}
              year={clampedYear}
              focus={focus}
              pins={pins}
              log={log && logAllowed}
              onSelect={selectCountry}
            />
          ) : (
            <div className="chart-frame">
              <p className="chart-empty">Preparing the chart…</p>
            </div>
          )}
        </section>
      </div>

      <section className="panel rank-panel" aria-label="Ranking">
        <div className="panel-head">
          <h2>Highest in {clampedYear}</h2>
          <p>
            {indicator.unit} · {reporting} countries
          </p>
        </div>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">
              Countries ranked by {indicator.name} in {clampedYear}
            </caption>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Country</th>
                <th>Value</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => {
                const rank = rows.findIndex((item) => item.iso3 === row.iso3) + 1;
                return (
                  <tr key={row.iso3} className={row.iso3 === focus ? "is-focus" : undefined}>
                    <td>{rank}</td>
                    <td>
                      <button type="button" onClick={() => selectCountry(row.iso3)}>
                        {row.name}
                      </button>
                    </td>
                    <td>{formatWithUnit(row.value, indicator)}</td>
                    <td>{formatDelta(row.value, row.previous) ?? "—"}</td>
                  </tr>
                );
              })}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={4}>No rows in {clampedYear}.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <StatusBar code={code} year={clampedYear} focus={focus} onSelectIndicator={selectIndicator} />
    </div>
  );
}
