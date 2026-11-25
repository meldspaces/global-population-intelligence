# Global Population Intelligence – Project Planning Document
**Version:** 1.1 | **Date:** 2026-11-25 | **Status:** Web App Skeleton Live on Railway  
**Repo:** `meldspaces/global-population-intelligence`  
**Live:** https://global-population-intelligence-production.up.railway.app  
**Host:** Railway (PostGIS + Node + React)

## 1. Mission & Scope
Independent, objective, statistical analysis of macro-scale human behavior catalysts.  
**Core Question:** How do consumption of food, drugs (legal/illegal stimulants, benzodiazepines, recreational substances), diet trends, climate, and demographics correlate with violence, crime categories (homicide, theft, vandalism), social unrest, mental illness, political/economic instability, and armed conflict (1930–2026)?

**Deliverables:**
- Database-driven responsive web app (desktop + mobile) with interactive charts, global maps (heatmaps, polygons, city-level drilldown), YoY trend tables.
- Raw + ETL tables in Postgres/PostGIS.
- Data source registry with coverage, geo, citations.
- Automated data refresh (schedules + weekly self-improving discovery routine).
- Connected Google Sheets edition (pivot tables + charts fed from warehouse). *(deferred)*
- Scalable architecture for future metrics/sources.

**Constraints:**
- 100% statistical, unbiased, big-data driven. Cite all sources + explicit estimates for gaps.
- Date drilldown: annual (max 1-year). Location: country → city (where data exists).
- Aggregate public data only. No individual records.
- Professional, readable copy. Footnotes for methods.

## 2. Tech Stack Recommendation (Nov 2026 Best Practices)
| Layer | Technology | Rationale |
|-------|------------|---------|
| **Frontend** | Vite + React 19 + TypeScript | Fastest DX, small bundles. |
| **Maps** | MapLibre GL JS | Open-source WebGL vector tiles. |
| **Charts** | Apache ECharts | Highly interactive, responsive. |
| **Backend** | Node.js + Fastify | Lightweight, TypeScript-native. |
| **Database** | PostgreSQL 17 + PostGIS 3.5 | Best-in-class for geo. |
| **ETL / Refresh** | Node scheduled jobs | Auto-run on startup if empty; future cron. |
| **Hosting** | Railway (app + PostGIS) | One-click PostGIS, private networking. |

## 3. Completed (as of 2026-11-25)
- [x] New repo created and seeded
- [x] PostGIS schema (`locations`, `indicators`, `observations`, `data_sources`)
- [x] Source registry seed (OWID, World Bank, UNODC, UCDP)
- [x] Indicator seed (homicide rate, calorie supply, conflict deaths)
- [x] OWID ETL loader (sample series, 800 rows each)
- [x] Fastify API (`/api/health`, `/api/sources`, `/api/indicators`, `/api/observations`)
- [x] Vite + React + MapLibre + ECharts frontend with indicator selector
- [x] Production build + static SPA serving on Railway
- [x] Automatic ETL on startup if observations empty
- [x] Loading/error states (white-screen fix)
- [x] Railway deployment live

## 4. Remaining Web App Work (priority order)
1. **Verify live page loads cleanly** after this push (static SPA + data).
2. **Country choropleth layer** — Natural Earth or geoBoundaries polygons + color by selected indicator.
3. **Country selector / filter** — dropdown or map click to filter chart to one country.
4. **Multi-series comparison** — overlay two indicators on the same chart.
5. **Source footnotes** — display citation + methodology under charts.
6. **Additional indicators** — World Bank GDP, UNODC drug prevalence (stimulants, benzos), climate proxies.
7. **Weekly discovery stub** — scheduled job that logs potential new sources.
8. **Materialized correlation views** (later).

## 5. Google Sheets
Deferred until web app core (map choropleth + multi-indicator) is solid.

## 6. Next Immediate Step
Confirm page load at https://global-population-intelligence-production.up.railway.app, then implement country choropleth.

---
*Updated after first successful Railway deploy and static-serving fix.*
