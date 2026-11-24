# Global Population Intelligence – Project Planning Document
**Version:** 1.0 | **Date:** 2026-11-24 | **Status:** Ready for Execution  
**Repo Transition:** Archive `meldspaces/us-population-intelligence` → Replace with `meldspaces/global-population-intelligence`  
**Host Recommendation:** Railway (PostGIS + Node + React) – primary. Cloudflare for static/edge assets if needed later.

## 1. Mission & Scope
Independent, objective, statistical analysis of macro-scale human behavior catalysts.  
**Core Question:** How do consumption of food, drugs (legal/illegal stimulants, benzodiazepines, recreational substances), diet trends, climate, and demographics correlate with violence, crime categories (homicide, theft, vandalism), social unrest, mental illness, political/economic instability, and armed conflict (1930–2026)?

**Deliverables:**
- Database-driven responsive web app (desktop + mobile) with interactive charts, global maps (heatmaps, polygons, city-level drilldown), YoY trend tables.
- Raw + ETL tables in Postgres/PostGIS.
- Data source registry with coverage, geo, citations.
- Automated data refresh (schedules + weekly self-improving discovery routine).
- Connected Google Sheets edition (pivot tables + charts fed from warehouse).
- Scalable architecture for future metrics/sources.

**Constraints:**
- 100% statistical, unbiased, big-data driven. Cite all sources + explicit estimates for gaps.
- Date drilldown: annual (max 1-year). Location: country → city (where data exists).
- Aggregate public data only. No individual records.
- Professional, readable copy. Footnotes for methods.

## 2. Tech Stack Recommendation (Nov 2026 Best Practices)
Research-driven selection for performance, lean code, geospatial scale, and Railway compatibility.

| Layer | Technology | Rationale |
|-------|------------|---------|
| **Frontend** | Vite + React 19 + TypeScript | Fastest DX, small bundles. Next.js optional later for SSR. |
| **Maps** | MapLibre GL JS + deck.gl | Open-source WebGL vector tiles. Native heatmaps, polygons, styled overlays. Superior performance vs Leaflet for large datasets. Three.js for advanced 3D globe views if required. |
| **Charts** | Apache ECharts | Highly interactive, responsive, excellent for YoY trends, correlations. |
| **Backend** | Node.js + Fastify (or Express) | Lightweight, TypeScript-native, efficient API for large queries. |
| **Database** | PostgreSQL 17 + PostGIS 3.5 | Best-in-class for geo (points, polygons, spatial joins, city-level reverse lookup). Proven on Railway. |
| **ETL / Refresh** | Node scheduled jobs + Python optional for heavy transforms | Webhook detection where available; cron based on known source frequencies; weekly discovery agent. |
| **Hosting** | Railway (app + PostGIS service) | One-click PostGIS, private networking, per-second billing, existing experience. Cloudflare R2/Workers for static tiles later if scale demands. |
| **Sheets Sync** | Google Apps Script or Python (gspread + SQLAlchemy) | Direct feed from post-ETL views. |

**Performance Principles:**
- Server-side vector tiles (ST_AsMVT or Martin) for maps.
- Materialized views for correlation matrices.
- Spatial indexes (GiST) on all geo columns.
- Lazy loading, virtualized tables, mobile-first responsive design.
- Token-efficient prompts for any future AI-assisted source discovery.

## 3. Data Sources (Initial Registry)
Primary public sources identified for deep coverage 1930–2026 (with gaps filled by estimates + citations).

| Source | Topics | Coverage | Geo Granularity | Update Frequency | Notes / Gaps |
|--------|--------|----------|-----------------|------------------|--------------|
| **Our World in Data (OWID)** | Homicide, conflict deaths, diet, health, GDP | 1950s–2026 | Country | Annual | Chart Data API available. Strong historical series. |
| **World Bank WDI** | Economy, demographics, health, climate proxies | 1960–2026 | Country | Annual | Free API. Excellent for correlations. |
| **UNODC** | Homicide, drug use prevalence, crime | ~1990–2026 | Country (+ some cities) | Annual | Intentional homicide, drug use (cannabis, amphetamines, opioids, etc.). |
| **WHO / GHO / IHME GBD** | Mortality, mental illness, substance abuse, diet-related | 1990–2023+ | Country | Annual | Global Burden of Disease – high quality estimates. |
| **UCDP / PRIO** | Armed conflict, battle deaths | 1946–2026 | Country / Conflict | Annual | Uppsala Conflict Data Program – precise conflict names (WW2 extension via historical sources, Korea, Arab Spring, Ukraine, etc.). |
| **FAO** | Diet composition, food supply | 1961–2026 | Country | Annual | Macronutrients, commodity categories. |
| **Historical Archives** | Pre-1950 crime, war deaths, drug use | 1930–1950 | Country | Static | League of Nations, academic reconstructions (cited). Estimates flagged. |
| **Climate (World Bank / NOAA proxies)** | Temperature, extreme events | 1930–2026 | Country | Annual | Correlates for unrest studies. |

**Additional:** UN Demographic Yearbook, CDC (US), Eurostat, national statistical offices for city-level where available.  
**Estimates Policy:** Explicitly labeled. Methods documented in footnotes (e.g., linear interpolation, regional averages, model-based from IHME).

## 4. Database Architecture
**Raw Tables** (one per source, named): `raw_owid_homicide`, `raw_unodc_drug_use`, `raw_wb_wdi`, `raw_ucdp_conflict`, etc.  
**ETL / Analytics Tables:**
- `locations` (country, admin1, city with PostGIS geometry + reverse lookup)
- `indicators` (standardized metrics: homicide_rate, amphetamine_prevalence, kcal_supply, etc.)
- `observations` (year, location_id, indicator_id, value, source_id, is_estimate, confidence)
- `conflicts` (name, start_year, end_year, location geometries)
- `correlations` (materialized – precomputed Pearson/Spearman by country/year window)
- `data_sources` (registry with description, coverage, geo, last_checked, trust_score)

**Geo Support:** POINT for cities, MULTIPOLYGON for countries/admin. Spatial queries for heatmap generation.  
**Drilldown:** Year (annual), Location (country → city).  
**Scale:** Partitioned by year; indexes optimized. Ready for additional metrics.

## 5. Web App Features
- **Global Map:** MapLibre heatmaps (crime rate, drug prevalence), polygon overlays by country, city markers with drilldown.
- **Interactive Charts:** YoY trends, multi-series (drug use vs homicide), correlation scatter, conflict timelines.
- **Filters:** Year range (1930–2026), substance/category (stimulant/benzo/legal/illegal), crime type, country, conflict name.
- **Drilldown Views:** Country profile, conflict profile (e.g., WWII, Ukraine), city-level where data exists.
- **Source Table:** Full registry with links, coverage, methods.
- **Analysis Copy:** Professional, neutral, cited. Footnotes for estimates and methods.
- **Responsive:** Mobile + desktop. Clean modern UI (Tailwind).

## 6. Data Refresh & Self-Improvement Routine
- **Initial:** Manual full ETL.
- **Ongoing:** 
  - Per-source schedule (weekly/monthly based on known cadence).
  - Webhook detection for sources that support it (rare; mostly polling).
  - **Weekly Discovery Job:** Search for new/higher-quality public sources, evaluate trust/granularity, recommend + auto-integrate high-confidence additions. Log improvements. Token-efficient LLM routine for evaluation.
- All changes versioned. Gap-filling estimates re-evaluated on new data.

## 7. Google Sheets Edition
- Connected spreadsheet in user Drive.
- Tabs: one per major post-ETL table + Summary (pivots + charts matching web app).
- Apps Script (or Python) pulls from Postgres views.
- Clear headers with source links, formulas, and logic notes.
- Auto-refresh schedule.

## 8. Migration Plan
1. Archive old repo (set archived=true or rename + archive).
2. Create new `global-population-intelligence` repo.
3. Seed with planning docs, schema, initial ETL stubs, frontend skeleton.
4. Deploy to Railway (reuse project or new).
5. Populate initial data + generate Sheets.
6. Activate refresh jobs.

## 9. Next Execution Steps
- Generate full schema SQL.
- Scaffold Vite+React+MapLibre app.
- Implement core ETL for OWID + World Bank + UNODC.
- Create source registry.
- Deploy skeleton to Railway.
- Generate Google Sheets connector.

**Grok 4.7 Recommendations Incorporated:**
- Prefer MapLibre + PostGIS over heavier GIS servers.
- Railway for integrated PostGIS (Cloudflare complementary, not primary).
- Materialized views + vector tiles for performance at scale.
- Explicit estimate flagging + source trust scoring for objectivity.
- Lean TypeScript stack for maintainability and token efficiency in future AI coding.
- Weekly discovery as a scheduled, auditable process rather than continuous.

---
*Document generated for immediate execution. All details preserved from user requirements.*
