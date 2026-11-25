import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  countryByCode,
  indicatorByCode,
  overlayRows,
  pairedYears,
  pearson,
  ranking,
  scatterPoints,
  SERIES,
  trendRows,
  type ChartMode,
} from "@/lib/gpi/model";

export type TrendChartProps = {
  mode: ChartMode;
  code: string;
  compare: string | null;
  year: number;
  focus: string;
  pins: string[];
  log: boolean;
  onSelect: (iso3: string) => void;
};

type Ink = { ink: string; copper: string; muted: string; line: string; surface: string };

function useInk(): Ink {
  const [ink, setInk] = useState<Ink>({
    ink: "#1c1915",
    copper: "#b4532a",
    muted: "#6f675e",
    line: "#e4dcd0",
    surface: "#fbf8f2",
  });
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
    setInk({
      ink: read("--color-ink", "#1c1915"),
      copper: read("--color-copper", "#b4532a"),
      muted: read("--color-muted", "#6f675e"),
      line: read("--color-line", "#e4dcd0"),
      surface: read("--color-surface", "#fbf8f2"),
    });
  }, []);
  return ink;
}

function isoFromClick(entry: unknown): string | null {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as { iso3?: string; payload?: { iso3?: string } };
  return record.iso3 ?? record.payload?.iso3 ?? null;
}

export function TrendChart(props: TrendChartProps) {
  const ink = useInk();
  const indicator = indicatorByCode(props.code);
  const compare = props.compare ? indicatorByCode(props.compare) : null;
  const focusName = countryByCode(props.focus)?.name ?? props.focus;
  const isos = useMemo(() => {
    const list = [props.focus, ...props.pins.filter((iso) => iso !== props.focus)];
    return list.slice(0, 5);
  }, [props.focus, props.pins]);

  const trend = useMemo(() => trendRows(props.code, isos), [props.code, isos]);
  const overlay = useMemo(
    () => (compare ? overlayRows(props.focus, props.code, compare.code) : []),
    [compare, props.code, props.focus],
  );
  const scatter = useMemo(
    () => (compare ? scatterPoints(props.code, compare.code, props.year) : []),
    [compare, props.code, props.year],
  );
  const bars = useMemo(() => ranking(props.code, props.year).slice(0, 12), [props.code, props.year]);
  const cross = useMemo(() => (compare ? pearson(scatter) : null), [compare, scatter]);
  const within = useMemo(
    () => (compare ? pearson(pairedYears(props.focus, props.code, compare.code)) : null),
    [compare, props.code, props.focus],
  );

  const tooltipStyle = {
    background: ink.surface,
    border: `1px solid ${ink.line}`,
    borderRadius: 8,
    fontSize: 13,
    color: ink.ink,
  };
  const tick = { fill: ink.muted, fontSize: 12 };

  let body = <p className="chart-empty">No observations for this selection.</p>;

  if (props.mode === "trend" && trend.length) {
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={trend} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={ink.line} vertical={false} />
          <XAxis dataKey="year" tick={tick} minTickGap={28} />
          <YAxis
            tick={tick}
            width={56}
            scale={props.log ? "log" : "auto"}
            domain={props.log || indicator.scale === "diverging" ? ["auto", "auto"] : [0, "auto"]}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <ReferenceLine x={props.year} stroke={ink.copper} strokeDasharray="3 3" />
          {isos.map((iso, index) => (
            <Line
              key={iso}
              type="monotone"
              dataKey={iso}
              name={countryByCode(iso)?.name ?? iso}
              stroke={SERIES[index % SERIES.length]}
              strokeWidth={iso === props.focus ? 2.4 : 1.6}
              dot={false}
              connectNulls={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    );
  } else if (props.mode === "overlay" && compare && overlay.length) {
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={overlay} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={ink.line} vertical={false} />
          <XAxis dataKey="year" tick={tick} minTickGap={28} />
          <YAxis yAxisId="left" tick={tick} width={56} />
          <YAxis yAxisId="right" orientation="right" tick={tick} width={56} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <ReferenceLine x={props.year} yAxisId="left" stroke={ink.copper} strokeDasharray="3 3" />
          <Line yAxisId="left" type="monotone" dataKey="left" name={indicator.short} stroke={ink.ink} dot={false} strokeWidth={2.2} connectNulls={false} />
          <Line yAxisId="right" type="monotone" dataKey="right" name={compare.short} stroke={ink.copper} dot={false} strokeWidth={2.2} connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  } else if (props.mode === "scatter" && compare && scatter.length) {
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={ink.line} />
          <XAxis type="number" dataKey="x" name={indicator.short} tick={tick} />
          <YAxis type="number" dataKey="y" name={compare.short} tick={tick} width={56} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={tooltipStyle} />
          <Scatter data={scatter} fill={ink.copper} onClick={(entry) => {
            const iso = isoFromClick(entry);
            if (iso) props.onSelect(iso);
          }} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  } else if (props.mode === "bars" && bars.length) {
    body = (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bars} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={ink.line} horizontal={false} />
          <XAxis type="number" tick={tick} scale={props.log ? "log" : "auto"} domain={props.log ? ["auto", "auto"] : [0, "auto"]} />
          <YAxis type="category" dataKey="name" width={128} tick={tick} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            onClick={(entry) => {
              const iso = isoFromClick(entry);
              if (iso) props.onSelect(iso);
            }}
          >
            {bars.map((row) => (
              <Cell key={row.iso3} fill={row.iso3 === props.focus ? ink.copper : ink.ink} cursor="pointer" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const correlation =
    props.mode === "scatter" && compare
      ? cross
        ? `Across countries in ${props.year}: r = ${cross.r.toFixed(2)} (n = ${cross.n}). A cross-section, not a cause.`
        : `Not enough paired countries in ${props.year} to estimate a correlation.`
      : props.mode === "overlay" && compare
        ? within
          ? `Within ${focusName} over time: r = ${within.r.toFixed(2)} (n = ${within.n}). Still not a cause.`
          : `Not enough overlapping years for ${focusName} to estimate a correlation.`
        : null;

  return (
    <div className="chart-stack">
      <div className="chart-frame">{body}</div>
      {correlation && <p className="fine">{correlation}</p>}
      <p className="citation">
        {indicator.name}: {indicator.citation}{" "}
        <a href={indicator.sourceUrl} target="_blank" rel="noreferrer">
          {indicator.source}
        </a>
        {compare ? (
          <>
            {" "}
            Compared with {compare.name}. {compare.citation}{" "}
            <a href={compare.sourceUrl} target="_blank" rel="noreferrer">
              {compare.source}
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}
