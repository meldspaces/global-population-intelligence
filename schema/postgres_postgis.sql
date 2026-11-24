-- Global Population Intelligence Schema (Postgres + PostGIS)
-- Focus: indicators, observations, locations, sources, correlations
-- Yearly granularity; city-level where available

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS data_sources (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  url TEXT,
  coverage_start INT,
  coverage_end INT,
  geo_level TEXT, -- country | admin1 | city
  update_frequency TEXT,
  trust_score NUMERIC(3,2),
  last_checked TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  iso2 CHAR(2),
  iso3 CHAR(3),
  name TEXT NOT NULL,
  level TEXT NOT NULL, -- country | admin1 | city
  parent_id INT REFERENCES locations(id),
  geom GEOMETRY(Geometry, 4326),
  centroid GEOMETRY(Point, 4326),
  population BIGINT,
  source_id INT REFERENCES data_sources(id)
);
CREATE INDEX idx_locations_geom ON locations USING GIST (geom);
CREATE INDEX idx_locations_level ON locations(level);

CREATE TABLE IF NOT EXISTS indicators (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- e.g. homicide_rate_per_100k, amphetamine_prevalence
  name TEXT NOT NULL,
  category TEXT, -- drug | crime | diet | climate | conflict | economic
  unit TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS observations (
  id BIGSERIAL PRIMARY KEY,
  year INT NOT NULL,
  location_id INT REFERENCES locations(id),
  indicator_id INT REFERENCES indicators(id),
  value NUMERIC,
  is_estimate BOOLEAN DEFAULT FALSE,
  confidence TEXT,
  source_id INT REFERENCES data_sources(id),
  notes TEXT,
  UNIQUE(year, location_id, indicator_id, source_id)
);
CREATE INDEX idx_obs_year_loc ON observations(year, location_id);
CREATE INDEX idx_obs_indicator ON observations(indicator_id);

CREATE TABLE IF NOT EXISTS conflicts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  start_year INT,
  end_year INT,
  description TEXT,
  location_ids INT[],
  source_id INT REFERENCES data_sources(id)
);

-- Materialized view for correlations (refreshed periodically)
-- CREATE MATERIALIZED VIEW mv_correlations AS ... 

COMMENT ON TABLE observations IS 'Core fact table. All values carry source and estimate flag.';
