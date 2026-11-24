# Global Population Intelligence

**Objective statistical analysis of macro-scale human behavior catalysts (1930–2026).**

How do food and drug consumption (stimulants, benzodiazepines, legal/illegal, recreational), diet trends, climate, and demographics correlate with violence, internationally recognized crime categories, social unrest, mental illness epidemics, political/economic instability, and armed conflict?

## Status
**Scaffold ready.** Core structure, PostGIS schema, Fastify API skeleton, MapLibre React frontend, and source seed ETL are in place.

## Live App
*(Railway deployment pending — next step)*

## Core Principles
- 100% statistical, unbiased, big-data driven.
- All sources cited. Estimates explicitly labeled with methods.
- Aggregate public data only.
- Scalable: new sources and metrics added over time.

## Stack (Nov 2026)
- **Frontend**: Vite + React 19 + TypeScript + MapLibre GL JS + ECharts
- **Backend**: Node.js + Fastify
- **Database**: PostgreSQL 17 + PostGIS 3.5 (Railway)
- **ETL**: Node jobs + weekly source-discovery routine
- **Sheets**: Google Apps Script / Python connector from post-ETL views

## Quick Start (Local)
```bash
cp .env.example .env
docker compose up -d   # PostGIS
npm install
npm run etl             # apply schema + seed sources
npm run dev             # Vite frontend (proxies /api)
npm run server          # Fastify API
```

## Documentation
- [Planning Document](docs/PLANNING.md)
- [Data Sources](docs/SOURCES.md)
- [Schema](schema/postgres_postgis.sql)

## Data Refresh
After initial manual load:
- Per-source intelligent schedules or webhook detection.
- Weekly self-improving discovery routine to fill gaps and improve quality.

---
*Built for scale. Hosted on Railway.*
