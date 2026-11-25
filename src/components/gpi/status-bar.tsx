import {
  COMPILED_AT,
  countriesInYear,
  countryByCode,
  coverage,
  formatDelta,
  formatWithUnit,
  indicatorByCode,
  isPreliminary,
  totalPoints,
  valueAt,
  priorPoint,
} from "@/lib/gpi/model";

type StatusBarProps = {
  code: string;
  year: number;
  focus: string;
  onSelectIndicator: (code: string) => void;
};

export function StatusBar({ code, year, focus, onSelectIndicator }: StatusBarProps) {
  const focusCountry = countryByCode(focus);
  const active = indicatorByCode(code);
  const value = valueAt(code, focus, year);
  const prior = value === null ? null : priorPoint(code, focus, year);
  const delta = value === null ? null : formatDelta(value, prior);
  const reporting = countriesInYear(code, year);
  const compiled = new Date(`${COMPILED_AT}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const sentence = [
    focusCountry?.name ?? focus,
    String(year),
    value === null ? `no ${active.short.toLowerCase()} row` : `${active.short} ${formatWithUnit(value, active)}`,
    delta,
    isPreliminary(code, year) ? "preliminary partial year" : null,
    `${reporting} countries reporting`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <footer className="status-bar">
      <p className="status-live" aria-live="polite">
        {sentence}
        <span className="status-snapshot">
          Snapshot {compiled} · {totalPoints().toLocaleString("en-US")} country-years
        </span>
      </p>
      <div className="meters">
        {coverage().map((row) => {
          const indicator = indicatorByCode(row.code);
          const reading = valueAt(row.code, focus, year);
          return (
            <button
              key={row.code}
              type="button"
              className="meter"
              aria-pressed={row.code === code}
              onClick={() => onSelectIndicator(row.code)}
            >
              <span className="meter-name">{indicator.short}</span>
              <span className="meter-value">
                {reading === null ? "No row" : formatWithUnit(reading, indicator)}
              </span>
              <span className="meter-meta">
                {row.countries} countries · {row.minYear}–{row.maxYear}
              </span>
            </button>
          );
        })}
      </div>
    </footer>
  );
}
