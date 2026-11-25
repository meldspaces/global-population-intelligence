import {
  countryByCode,
  formatWithUnit,
  indicatorByCode,
  isPreliminary,
  priorPoint,
  valueAt,
  yearSummary,
} from "@/lib/gpi/model";
import type { AnalysisBlock } from "@/lib/gpi/reports";

export function sentimentFor(series: string, year: number): { label: string; method: string } {
  const summary = yearSummary(series, year);
  if (!summary.n) {
    return { label: "Unscored", method: "No country rows for this year, so no tone is assigned." };
  }
  if (series === "conflict_deaths") {
    const top = summary.top[0]?.value ?? 0;
    if (top >= 10000) {
      return {
        label: "Grave",
        method: "Rule: the highest country toll in this year is at least 10,000. This is not a language model.",
      };
    }
  }
  if (series === "temperature_anomaly" && summary.above / summary.n > 0.8) {
    return {
      label: "Warm",
      method: "Rule: more than 80 percent of reporting countries are above their 1991–2020 average.",
    };
  }
  return {
    label: "Mixed",
    method: "Rule: this year does not cross the grave or warm threshold on its series.",
  };
}

function Stat({ block }: { block: AnalysisBlock }) {
  if (block.type === "stat_year") {
    const indicator = indicatorByCode(block.series);
    const summary = yearSummary(block.series, block.year);
    if (!summary.n || summary.median === null) return <p>No rows in {block.year}.</p>;
    const warm =
      indicator.code === "temperature_anomaly"
        ? ` ${summary.above} of ${summary.n} countries were above their recent average. Median ${formatWithUnit(summary.median, indicator)}.`
        : ` ${summary.n} countries report. Median ${formatWithUnit(summary.median, indicator)}.`;
    return (
      <p className="stat-line">
        {block.year}
        {isPreliminary(block.series, block.year) ? " (preliminary)" : ""}:{warm}
      </p>
    );
  }
  if (block.type === "stat_top") {
    const indicator = indicatorByCode(block.series);
    const top = yearSummary(block.series, block.year).top.slice(0, block.n);
    if (!top.length) return <p>No rows in {block.year}.</p>;
    return (
      <p className="stat-line">
        Highest in {block.year}:{" "}
        {top.map((row) => `${row.name} ${formatWithUnit(row.value, indicator)}`).join("; ")}.
      </p>
    );
  }
  if (block.type === "stat_focus") {
    const indicator = indicatorByCode(block.series);
    const name = countryByCode(block.iso)?.name ?? block.iso;
    const value = valueAt(block.series, block.iso, block.year);
    if (value === null) return <p>No {name} row in {block.year}.</p>;
    const prior = priorPoint(block.series, block.iso, block.year);
    return (
      <p className="stat-line">
        {name}, {block.year}
        {isPreliminary(block.series, block.year) ? " (preliminary)" : ""}: {formatWithUnit(value, indicator)}
        {prior ? `. Prior observation ${formatWithUnit(prior.value, indicator)} in ${prior.year}.` : "."}
      </p>
    );
  }
  return null;
}

export function Analysis({
  blocks,
  year,
  iso,
}: {
  blocks: AnalysisBlock[];
  year?: number;
  iso?: string;
}) {
  return (
    <div className="analysis">
      {blocks.map((block, index) => {
        if (block.type === "heading") return <h3 key={index}>{block.text}</h3>;
        if (block.type === "paragraph") return <p key={index}>{block.text}</p>;
        if (block.type === "stat_focus") {
          return <Stat key={index} block={{ ...block, year: year ?? block.year, iso: iso ?? block.iso }} />;
        }
        return <Stat key={index} block={{ ...block, year: year ?? block.year }} />;
      })}
    </div>
  );
}
