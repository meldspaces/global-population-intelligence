-- Warehouse tables for the Railway PostGIS database.
-- Not applied by the preview (no PostGIS extension there).
-- Reports and findings are in migrations/ and apply on Railway at startup.
-- Never delete observations. Refresh them.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS data_sources (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  url TEXT,
  coverage_start INT,
  coverage_end INT,
  geo_level TEXT,
  update_frequency TEXT,
  trust_score NUMERIC(3,2),
  last_checked TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  iso2 TEXT,
  iso3 TEXT,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  parent_id INT REFERENCES locations(id),
  geom GEOMETRY(Geometry, 4326),
  centroid GEOMETRY(Point, 4326),
  population BIGINT,
  source_id INT REFERENCES data_sources(id)
);
CREATE INDEX IF NOT EXISTS idx_locations_geom ON locations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_locations_level ON locations(level);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);

CREATE TABLE IF NOT EXISTS indicators (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
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
CREATE INDEX IF NOT EXISTS idx_obs_year_loc ON observations(year, location_id);
CREATE INDEX IF NOT EXISTS idx_obs_indicator ON observations(indicator_id);

CREATE TABLE IF NOT EXISTS conflicts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  start_year INT,
  end_year INT,
  description TEXT,
  location_ids INT[],
  source_id INT REFERENCES data_sources(id)
);
