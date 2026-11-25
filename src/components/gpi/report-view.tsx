import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { Analysis, sentimentFor } from "@/components/gpi/analysis";
import type { MapViewProps } from "@/components/gpi/map-view";
import { TopicIcon } from "@/components/gpi/topic-icon";
import type { TrendChartProps } from "@/components/gpi/trend-chart";
import {
  coverageFor,
  countryByCode,
  defaultYear,
  indicatorByCode,
  INDICATORS,
  isPreliminary,
  searchCountries,
  type ChartMode,
} from "@/lib/gpi/model";
import type { ReportDetail } from "@/lib/gpi/reports";

const MODES: { id: ChartMode; label: string }[] = [
  { id: "trend", label: "Trend" },
  { id: "overlay", label: "Overlay" },
  { id: "scatter", label: "Scatter" },
  { id: "bars", label: "Rank" },
];

export function ReportView({ report }: { report: ReportDetail }) {
  const seriesList = report.seriesCodes.length ? report.seriesCodes : [INDICATORS[0].code];
  const [code, setCode] = useState(seriesList[0]);
  const [year, setYear] = useState(() => report.focusYear ?? defaultYear(seriesList[0]));
  const [focus, setFocus] = useState(report.focusIso ?? "USA");
  const [mode, setMode] = useState<ChartMode>("trend");
  const [compare, setCompare] = useState<string | null>(seriesList[1] ?? null);
  const [log, setLog] = useState(false);
  const [query, setQuery] = useState("");
  const [MapView, setMapView] = useState<ComponentType<MapViewProps> | null>(null);
  const [Chart, setChart] = useState<ComponentType<TrendChartProps> | null>(null);

  const bounds = coverageFor(code);
  const clampedYear = Math.min(bounds.maxYear, Math.max(bounds.minYear, year));
  const focusCountry = countryByCode(focus);
  const matches = searchCountries(query);
  const indicator = indicatorByCode(code);
  const tone = sentimentFor(code, clampedYear);
  const logAllowed = mode === "trend" || mode === "bars";
  const articles = report.links.filter((link) => link.kind !== "data");
  const sources = report.links.filter((link) => link.kind === "data");

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

  function selectSeries(next: string) {
    const nextBounds = coverageFor(next);
    setCode(next);
    setYear((current) => Math.min(nextBounds.maxYear, Math.max(nextBounds.minYear, current)));
    if (compare === next) setCompare(seriesList.find((item) => item !== next) ?? null);
  }

  return (
    <article className="report-page">
      <p className="kicker">
        <TopicIcon name={report.iconKey} /> {report.category} · {report.asOf}
      </p>
      <h1>{report.title}</h1>
      <p className="lede">{report.dek}</p>
      {report.finding && <p className="finding">Why this is ranked here: {report.finding}</p>}
      <p className="tone">
        <strong>{tone.label}.</strong> {tone.method}
      </p>

      <section className="toolbar" aria-label="Year and series">
        {seriesList.length > 1 && (
          <div className="chip-row" role="group" aria-label="Series">
            {seriesList.map((item) => (
              <button
                key={item}
                type="button"
                className="chip"
                aria-pressed={item === code}
                onClick={() => selectSeries(item)}
              >
                {indicatorByCode(item).short}
              </button>
            ))}
          </div>
        )}
        <label className="year-control">
          <span>
            Year {clampedYear}
            {isPreliminary(code, clampedYear) ? " · preliminary" : ""}
            {" · "}
            {focusCountry?.name ?? focus}
          </span>
          <input
            type="range"
            min={bounds.minYear}
            max={bounds.maxYear}
            value={clampedYear}
            onChange={(event) => setYear(Number(event.target.value))}
          />
        </label>
      </section>

      <Analysis blocks={report.analysis} year={clampedYear} iso={focus} />

      <div className="stage">
        <section className="panel" aria-label="Map">
          <div className="panel-head">
            <h2>Map</h2>
            <p>
              {indicator.short}, {clampedYear}
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
              aria-controls="report-country-matches"
            />
          </label>
          {matches.length > 0 && (
            <ul id="report-country-matches" className="matches">
              {matches.map((country) => (
                <li key={country.iso3}>
                  <button
                    type="button"
                    onClick={() => {
                      setFocus(country.iso3);
                      setQuery("");
                    }}
                  >
                    {country.name}
                    <span>{country.iso3}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {MapView ? (
            <MapView
              code={code}
              year={clampedYear}
              focus={focus}
              onSelect={(iso3) => {
                setFocus(iso3);
                setQuery("");
              }}
            />
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
            <h2>{indicator.short}</h2>
            <p>Computed from the warehouse</p>
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
                    {item.short}
                  </option>
                ))}
              </select>
            </label>
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
          {Chart ? (
            <Chart
              mode={mode}
              code={code}
              compare={compare}
              year={clampedYear}
              focus={focus}
              pins={[]}
              log={log && logAllowed}
              onSelect={setFocus}
            />
          ) : (
            <div className="chart-frame">
              <p className="chart-empty">Preparing the chart…</p>
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>Data sources</h2>
        <ul className="link-list">
          {sources.map((link) => (
            <li key={link.url}>
              <a href={link.url} target="_blank" rel="noreferrer">
                {link.title}
              </a>
              <span>
                {link.author ?? "Source"} · relevance {link.relevance}. {link.relevanceReason}
              </span>
            </li>
          ))}
          {sources.length === 0 && <li>No data source cleared the relevance check.</li>}
        </ul>
      </section>
      <section className="panel">
        <h2>Related articles and posts</h2>
        <ul className="link-list">
          {articles.map((link) => (
            <li key={link.url}>
              <a href={link.url} target="_blank" rel="noreferrer">
                {link.title}
              </a>
              <span>
                {link.author ?? link.account ?? "Unsigned"}
                {link.publishedOn ? ` · ${link.publishedOn}` : ""} · relevance {link.relevance}. {link.relevanceReason}
              </span>
              {link.excerpt && <span>{link.excerpt}</span>}
              <span className="bias">
                Author {link.biasAuthor} · account {link.biasAccount} · post {link.biasPost}
                {link.biasRater ? ` · ${link.biasRater}` : " · no published rating on file"}
                {link.biasCheckedOn ? `, checked ${link.biasCheckedOn}` : ""}
              </span>
            </li>
          ))}
          {articles.length === 0 && <li>No article or post cleared the relevance check today.</li>}
        </ul>
      </section>
      {report.people.length > 0 && (
        <section className="panel">
          <h2>People named in the sources</h2>
          <ul className="link-list">
            {report.people.map((person) => (
              <li key={`${person.name}-${person.sourceUrl}`}>
                <a href={person.sourceUrl} target="_blank" rel="noreferrer">
                  {person.name}
                </a>
                <span>
                  {person.role}. Named in {person.sourceTitle}.
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="fine">
        This app does not store information about people who use it. Figures follow the year and country selected
        above and are calculated when the page loads.
      </p>
      <p>
        <Link to="/" className="text-button">
          Back to the atlas
        </Link>
      </p>
    </article>
  );
}
