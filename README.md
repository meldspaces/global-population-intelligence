# Global Population Intelligence

**Objective statistical analysis of macro-scale human behavior catalysts (1930–2026).**

How do food and drug consumption (stimulants, benzodiazepines, legal/illegal, recreational), diet trends, climate, and demographics correlate with violence, internationally recognized crime categories, social unrest, mental illness epidemics, political/economic instability, and armed conflict?

## Status
**Ready for first Railway deployment.**

- PostGIS schema + source/indicator seed
- OWID ETL (homicide rate, calorie supply, conflict deaths)
- Fastify API (`/api/sources`, `/api/indicators`, `/api/observations`)
- Vite + React + MapLibre + ECharts frontend with indicator selector
- Production build + static serving (`npm start`)

## Live App
Deploy to Railway (GitHub connected → auto-deploy on push).

## Core Principles
- 100% statistical, unbiased, big-data driven.
- All sources cited. Estimates explicitly labeled with methods.
- Aggregate public data only.
- Scalable: new sources and metrics added over time.

## Stack (Nov 2026)
- **Frontend**: Vite + React 19 + MapLibre GL JS + ECharts
- **Backend**: Node.js + Fastify (serves API + built frontend)
- **Database**: PostgreSQL 17 + PostGIS 3.5 (Railway)
- **ETL**: Node jobs (`npm run etl`)

## Quick Start (Local)
```bash
cp .env.example .env
docker compose up -d   # PostGIS
npm install
npm run etl             # schema + sources + sample OWID data
npm run server          # API on :8080
npm run dev             # Vite frontend (proxies /api)
```

## Railway Deploy
1. Create project → Add PostGIS template.
2. Connect this GitHub repo (auto-deploy enabled).
3. Set environment variable `DATABASE_URL` from the PostGIS service.
4. Deploy. First boot runs `npm start` (builds frontend + starts server).
5. After deploy, run `npm run etl` once via Railway shell or a one-off job to load data.

## Documentation
- [Planning Document](docs/PLANNING.md)
- [Data Sources](docs/SOURCES.md)
- [Schema](schema/postgres_postgis.sql)

---
*Built for scale. Hosted on Railway.*
