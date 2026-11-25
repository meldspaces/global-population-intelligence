import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

type Point = [number, number];
type Warehouse = {
  indicators: { code: string }[];
  series: Record<string, Record<string, Point[]>>;
};

const warehouse = JSON.parse(
  readFileSync(new URL("./warehouse.json", import.meta.url), "utf8"),
) as Warehouse;

const REQUIRED = [
  "homicide_rate_per_100k",
  "calorie_supply",
  "conflict_deaths",
  "gdp_per_capita",
  "alcohol_per_capita",
  "temperature_anomaly",
];

test("every planned indicator has country-year rows", () => {
  const codes = new Set(warehouse.indicators.map((indicator) => indicator.code));
  for (const code of REQUIRED) {
    assert.ok(codes.has(code), `missing indicator ${code}`);
    const series = warehouse.series[code];
    const countries = Object.keys(series ?? {}).length;
    const points = Object.values(series ?? {}).reduce((sum, pts) => sum + pts.length, 0);
    assert.ok(countries >= 150, `${code} countries ${countries}`);
    assert.ok(points >= 3000, `${code} points ${points}`);
  }
});

test("United States has a 2020 row for every indicator, including an explicit conflict zero", () => {
  for (const code of REQUIRED) {
    const row = (warehouse.series[code]?.USA ?? []).find((point) => point[0] === 2020);
    assert.ok(row, `${code} missing USA 2020`);
  }
  const conflict = (warehouse.series.conflict_deaths.USA ?? []).find((point) => point[0] === 2020);
  assert.equal(conflict?.[1], 0);
});
