# Global Population Intelligence — autopilot plan

Baseline date: 2026-11-25. The live app is the Railway service. The warehouse database is the existing Railway PostgreSQL 17 + PostGIS database. Do not add a second database.

## Purpose

Regular public-interest research drives development. Each pass finds what people are talking about now, writes that finding down, and advances one slice of reporting on the statistical trends tied to those topics.

That research decides three things:

- which reports are prioritized on the home page
- how those reports appear
- what the written analysis says

The atlas (map, status bar, warehouse charts) stays. Reports are the reading layer on top of it. A trending topic with thin evidence can still be featured, but the page must say the evidence is thin.

The visual system stays paper, ink, and copper. A pass may improve spacing, type, contrast, or a control. It does not introduce a new palette, a new type system, or decorative chrome.

## Database

The warehouse of record is the Railway PostGIS database. It is sufficient.

- `observations` is the fact table: year, location, indicator, value, source, and an estimate flag.
- `locations.geom` holds country polygons, and later city boundaries where a real boundary exists.
- `indicators` and `data_sources` cover new series. Drugs, refugees, and food insecurity are new rows, not a new database.
- `interest_findings` stores each day's public-interest research so the next run can read it. Rows are inserted, never deleted.
- `reports` are ranked by priority and never deleted. Refresh and re-rank only.
- `report_links` and `report_people` hold cited articles, posts, bias marks, and named public figures.

The atlas still reads the shipped country-year snapshot in `src/lib/gpi/warehouse.json` for the six series. New series land in that snapshot and, when a loader is ready, in `observations`. Schema changes are SQL files in `migrations/` and are applied on process start when `DATABASE_URL` is set.

## Report page contract

Each report is one topic. The first unfinished item in the backlog is the work, unless the live app is broken.

A report page must:

- Stay flexible. Map, year, country, chart mode, and which series are in view all respond to the topic.
- Work on phones, tablets, and desktops. No horizontal overflow. Controls stay usable by touch.
- Stay dynamic. Figures are computed. Changing the year or country updates every figure that depends on it. Do not paste statistics into prose.
- Format the analysis as a headline, a dek, an as-of date, and short sections. No walls of text. No emoji.
- List related articles and posts with a relevance score from 0 to 100. Drop anything under 60. The URL, the date, and the topic must be real. Do not invent posts.
- Show a left/right bias scale separately for the author, the account, and the post. Allowed values: Left, Lean left, Center, Lean right, Right, Unrated. Use a published rating and name the rater and the date checked. If none exists, the value is Unrated.
- List people only when a cited source for this topic names them.
- State the data sources used: series name, publisher, and URL.

## Each run

The execution date is the group. One pass does one slice, then deploys.

1. If the live app is blank, the map is missing, the status bar is stuck, a known series shows as missing, or a report violates the contract, fix that first.
2. Otherwise search the public web for what is trending now in conflict, crime, drugs, diet, climate, income, and topics clearly tied to those.
3. Insert one `interest_findings` row for that search. Do not delete older findings. Re-rank `reports.priority` from the finding. Do not delete a report.
4. Do the first unfinished backlog item that this search justifies. One slice only.
5. Keep the paper / ink / copper UI. No auth wall. No emoji. No second database. No personal data about people who use the app.
6. Ship gate: `node scripts/gpi-ship.mjs` when the slice touches the warehouse or the build. `npm run typecheck` at minimum for a UI slice.
7. Update `docs/tracker.json` so the execution date lists every item touched, with `state` of `closed` only when the work is on `main`. Then `node scripts/sync-tracker.mjs`.
8. Push `main`. Railway builds the Dockerfile and deploys. Migrations run at start. Confirm `/api/health` returns `"service":"global-population-intelligence"`.
9. Append one line to the log below.

GitHub Projects are not available to the automation token. Grouping is a milestone named with the execution date (`2026-11-25`), the label `run:YYYY-MM-DD`, and the assignee `meldspaces`. Closed issues use the completed reason. Open issues stay open until the work is on `main`.

## Standing

- Public-interest research is the input. Statistical trend reporting is the output.
- 2026 conflict deaths are preliminary and partial. Never describe them as a finished year.
- Numbers are computed. Bias ratings are cited or Unrated. People and posts are real or omitted.
- Missing on purpose until a clean table exists: stimulant and benzodiazepine prevalence, city drilldown.

## Done

- [x] Cited country-year warehouse (1930–2026), six series
- [x] Status bar lists every series for the selected country and year, including real zeros
- [x] Interactive map: hover, click-to-focus, zoom, year color
- [x] Charts: trend, dual-axis overlay, scatter with Pearson r, rank bars, pins, year, log
- [x] Home page topic rail and mosaic, ordered from `reports`
- [x] Report pages: own URL, SEO, computed figures, sources, bias, people
- [x] Report controls: year, country, map click, and chart mode recompute the figures
- [x] Railway Dockerfile deploy on push to `main`
- [x] Map container keeps its height so the canvas is not clipped

## Backlog

- [ ] Home order follows a fresh public-interest search each run, written to `interest_findings` and never deleted
- [ ] Record a published bias rater wherever one exists; leave the rest Unrated
- [ ] One drug-prevalence series from a citable country-year table
- [ ] City drilldown only where that table exists
- [ ] Refugee or food-insecurity series if a stable public CSV is found

## Log

- 2026-11-25 baseline: six OWID series, map, charts, status bar, featured strip.
- 2026-11-25 plan: public-interest research drives report priority, home-page order, and written analysis.
- 2026-11-25 railway: Dockerfile image replaced the old app. Health check serves this service.
- 2026-11-25 reports: year, country, map click, and chart mode recompute the figures.
- 2026-11-25 map: the canvas was clipped because the MapLibre stylesheet collapsed the frame. The frame now keeps its height.
- 2026-11-25 tracker: issues are grouped by the execution date 2026-11-25.
