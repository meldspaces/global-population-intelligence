# Global Population Intelligence — autopilot plan

Baseline date: 2026-11-25. The preview is the product. Do not replace the Railway app with this workspace. The warehouse database stays the existing Railway PostGIS.

## Purpose

Regular public-interest research drives development. The ambitious target is a routine that truly runs on autopilot: each pass finds what people are talking about now, then advances the app toward reporting the statistical trends tied to those topics.

That research decides three things:

- which reports are prioritized on the home page
- how those reports appear
- what the written analysis says

The atlas (map, status bar, warehouse charts) stays. Reports are the reading layer on top of it. A trending topic with thin evidence can still be featured, but the page must say the evidence is thin.

## Database

The warehouse of record is the Railway PostgreSQL 17 + PostGIS 3.5 database named in `docs/PLANNING.md` of `meldspaces/global-population-intelligence`. It is sufficient. Do not add Neon, a second Postgres, or a new host.

What already fits, in `schema/postgres_postgis.sql`:

- `observations` is the fact table: year, location, indicator, value, source, and an estimate flag. About 50,000 country-year points today, and a few hundred thousand later, are a small table for this server. Storage stays in the tens of megabytes even with indexes.
- `locations.geom` is the right place for country polygons, and later for cities where a real boundary exists.
- `indicators` and `data_sources` already cover new series. Drugs, refugees, and food insecurity are new rows, not a new database.

What that schema does not have yet, and what gets added on the same database, never a new one:

- `interest_findings` for each day's public-interest research, so the next run can read it.
- `reports`, ranked by priority and never deleted. Refresh and re-rank only.
- `report_links` and `report_people` for cited articles, posts, bias marks, and named people.

The live Railway service currently holds a sample load, not the full series. That is a loader limit, not a PostGIS limit. This workspace has no `DATABASE_URL`, so the preview keeps the JSON snapshot until that variable is available. Schema changes are written for that PostGIS database and applied there when the connection is present.

## Report page contract

Each report is one topic, and it is a comprehensive analysis. The first unfinished item in the backlog is the work, unless the preview is broken.

A report page must:

- Stay flexible. Map, year, country, chart mode, and which series are in view all respond to the topic. Do not freeze one story into a layout that cannot show the next topic.
- Work on phones, tablets, and desktops. No horizontal overflow. Controls stay usable by touch.
- Stay dynamic. Figures in the analysis are computed from the warehouse or from a cited table in the repo. Changing the year or country updates every figure that depends on it. Do not paste statistics into prose.
- Format the analysis as a headline, a dek, an as-of date, and short sections: what is happening, what the numbers show, and what we cannot say. No walls of text. No emoji.
- List related articles and social posts. Each item has a title or excerpt, author or account, date, URL, a relevance score from 0 to 100, and a one-line reason. Drop anything under 60, or show it only as weak context. Validate before including: the URL is real, the item is about this topic, and the date is real. Do not invent posts.
- Show a left/right bias scale separately for the author, the social account, and the post when those differ. The only allowed values are Left, Lean left, Center, Lean right, Right, and Unrated. Use a published rating (AllSides, Ad Fontes, Media Bias/Fact Check, or the outlet's own disclosed stance) and name the rater plus the date checked. If no published rating exists, the value is Unrated. Never invent a score. Bias is not relevance and is not accuracy. Show those three apart.
- List relevant people only when a cited source for this topic names them. Give the name, the role, and the source. Omit the section when nobody qualifies.
- State the data sources used in the analysis on the page: series name, publisher, and URL. Every figure traces to one of those sources.

## Home page

- Order reports by current public interest, then by how complete the statistical evidence is.
- The prioritized report is the first thing under the title. The atlas remains available on the same page.
- Interest framing may be edited. Statistics may not be typed into that framing.

## Each run — one slice

1. If the preview is blank, the status bar is stuck, a known series shows as missing, or a report violates the contract above, fix that first.
2. Otherwise search the public web for what is trending now in conflict, crime, drugs, diet, climate, income, and topics clearly tied to those.
3. Do the first unfinished backlog item that this search justifies. One slice only. Prefer the report shell until it exists, then one full report for the top justified topic, then a cited series that report still lacks.
4. Keep the paper / ink / copper UI. No auth. No emoji. No second database. Reports and findings go on the Railway PostGIS. Never delete a report or a finding.
5. Ship gate: `node scripts/gpi-ship.mjs`, then `sh /workspace/startup.sh`, then `node scripts/browser-smoke.mjs`. Read both screenshots.
6. Production render: `npm run preview:restart` and smoke the built app on 127.0.0.1:8081 with the dev JSON as `--baseline`. Then stop the 8081 preview.
7. Append one line to the log. Leave the dev server running. Write `docs/LAST_SHIP.json`.
8. Do not call Vercel, Railway, or a publish API. There is no deploy credential. A green production build is the ship. The live preview updates from the dev server. The public URL updates when the user publishes.

## Standing

- Public-interest research is the input. Statistical trend reporting is the output.
- 2026 conflict deaths are preliminary and partial. Never describe them as a finished year.
- Numbers are computed. Bias ratings are cited or Unrated. People and posts are real or omitted.
- Missing on purpose until a clean table exists: stimulant and benzodiazepine prevalence, city drilldown.

## Done

- [x] Grok Build app with a cited country-year warehouse (1930–2026)
- [x] Six series, each with rows: homicide, calories, conflict deaths, GDP per capita, alcohol, temperature anomaly
- [x] Status bar lists every series for the selected country and year, including real zeros
- [x] Interactive map: hover, click-to-focus, zoom, year color
- [x] Charts: trend, dual-axis overlay, scatter with Pearson r, rank bars, pins, year, log
- [x] Public-interest strip. News text lives in `src/lib/gpi/featured.ts`. Numbers are computed from the warehouse
- [x] Regression test: `src/lib/gpi/warehouse.test.ts`

## Backlog

- [x] Report page template that meets the contract (flexible, responsive, dynamic, formatted analysis, sources)
- [ ] Home page prioritizes reports from current public interest
- [ ] First full report for the leading trending topic that the warehouse can support, including validated articles and posts, bias marks, people, and sources
- [ ] Further reports as new topics take the lead. Retire or demote a report when interest fades
- [ ] One drug-prevalence series (opioids, stimulants, or benzodiazepines) from a citable country-year table
- [ ] City drilldown only where that table exists
- [ ] Refugee or food-insecurity series if a stable public CSV is found

## Log

- 2026-11-25 baseline: six OWID series, map, charts, status bar, featured strip. Production build green.
- 2026-11-25 plan: public-interest research now drives report priority, home-page order, and written analysis. Report contract added.
- 2026-11-25 report shell: year, country, map click, and chart mode now recompute the figures on each report page. Railway is serving the atlas.
