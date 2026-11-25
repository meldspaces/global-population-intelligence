import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

export async function runETL(pool: pg.Pool) {
  const schema = fs.readFileSync('./schema/postgres_postgis.sql', 'utf8');
  await pool.query(schema);
  // Widen iso3 if it was CHAR(3)
  await pool.query(`ALTER TABLE locations ALTER COLUMN iso3 TYPE TEXT`).catch(() => {});
  await pool.query(`ALTER TABLE locations ALTER COLUMN iso2 TYPE TEXT`).catch(() => {});
  console.log('Schema applied');

  await seedSources(pool);
  await seedIndicators(pool);

  await loadOwidSeries(pool, 'https://ourworldindata.org/grapher/homicide-rate-unodc.csv?v=1&csvType=full&useColumnShortNames=true', 'homicide_rate_per_100k', 3, 2000);
  await loadOwidSeries(pool, 'https://ourworldindata.org/grapher/daily-per-capita-caloric-supply.csv?v=1&csvType=full&useColumnShortNames=true', 'calorie_supply', 3, 2000);
  await loadOwidSeries(pool, 'https://ourworldindata.org/grapher/deaths-in-armed-conflicts-by-country.csv?v=1&csvType=full&useColumnShortNames=true', 'conflict_deaths', 3, 2000);

  console.log('ETL complete');
}

async function seedSources(pool: pg.Pool) {
  const sources = [
    { name: 'Our World in Data', url: 'https://ourworldindata.org', description: 'Homicide, conflict, diet, health indicators with Chart Data API', coverage_start: 1950, coverage_end: 2026, geo_level: 'country', update_frequency: 'annual', trust_score: 0.95 },
    { name: 'World Bank WDI', url: 'https://data.worldbank.org', description: 'Economic, demographic, health, and climate proxies', coverage_start: 1960, coverage_end: 2026, geo_level: 'country', update_frequency: 'annual', trust_score: 0.93 },
    { name: 'UNODC', url: 'https://data.unodc.org', description: 'Homicide and drug use prevalence by substance', coverage_start: 1990, coverage_end: 2026, geo_level: 'country', update_frequency: 'annual', trust_score: 0.90 },
    { name: 'UCDP/PRIO', url: 'https://ucdp.uu.se', description: 'Armed conflict and battle-related deaths', coverage_start: 1946, coverage_end: 2026, geo_level: 'country', update_frequency: 'annual', trust_score: 0.92 }
  ];

  for (const s of sources) {
    await pool.query(
      `INSERT INTO data_sources (name, description, url, coverage_start, coverage_end, geo_level, update_frequency, trust_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, last_checked = now()`,
      [s.name, s.description, s.url, s.coverage_start, s.coverage_end, s.geo_level, s.update_frequency, s.trust_score]
    );
  }
  console.log('Seeded data_sources');
}

async function seedIndicators(pool: pg.Pool) {
  await pool.query(`
    INSERT INTO indicators (code, name, category, unit, description)
    VALUES
      ('homicide_rate_per_100k', 'Intentional homicide rate', 'crime', 'per 100,000', 'UNODC via OWID'),
      ('conflict_deaths', 'Deaths in armed conflicts', 'conflict', 'count', 'UCDP via OWID'),
      ('calorie_supply', 'Daily calorie supply per person', 'diet', 'kcal/person/day', 'FAO via OWID')
    ON CONFLICT (code) DO NOTHING
  `);
  console.log('Seeded indicators');
}

function safeCode(raw: string | null): string | null {
  if (!raw) return null;
  const c = raw.replace(/"/g, '').trim();
  if (!c || c.length > 8) return null; // skip OWID region codes that are too long
  return c;
}

async function loadOwidSeries(pool: pg.Pool, url: string, indicatorCode: string, valueColIndex = 3, maxRows = 2000) {
  console.log(`Fetching ${indicatorCode}...`);
  const res = await fetch(url, { headers: { 'User-Agent': 'GPI-ETL/1.0' } });
  if (!res.ok) {
    console.warn(`Fetch failed for ${indicatorCode}: ${res.status}`);
    return;
  }
  const text = await res.text();
  const lines = text.trim().split('\n');
  if (lines.length < 2) return;

  const sourceRes = await pool.query(`SELECT id FROM data_sources WHERE name = 'Our World in Data'`);
  const sourceId = sourceRes.rows[0]?.id;
  const indRes = await pool.query(`SELECT id FROM indicators WHERE code = $1`, [indicatorCode]);
  const indicatorId = indRes.rows[0]?.id;
  if (!sourceId || !indicatorId) return;

  let loaded = 0;
  for (const line of lines.slice(1, maxRows)) {
    const cols = line.split(',');
    if (cols.length <= valueColIndex) continue;
    const entity = cols[0]?.replace(/"/g, '').trim();
    const code = safeCode(cols[1]);
    const year = parseInt(cols[2], 10);
    const value = parseFloat(cols[valueColIndex]);
    if (!entity || isNaN(year) || isNaN(value)) continue;

    try {
      const locRes = await pool.query(
        `INSERT INTO locations (name, level, iso3) VALUES ($1, 'country', $2)
         ON CONFLICT DO NOTHING RETURNING id`,
        [entity, code]
      );
      let locId = locRes.rows[0]?.id;
      if (!locId) {
        const existing = await pool.query(`SELECT id FROM locations WHERE name = $1 AND level = 'country' LIMIT 1`, [entity]);
        locId = existing.rows[0]?.id;
      }
      if (!locId) continue;

      await pool.query(
        `INSERT INTO observations (year, location_id, indicator_id, value, is_estimate, source_id)
         VALUES ($1,$2,$3,$4,false,$5)
         ON CONFLICT (year, location_id, indicator_id, source_id) DO UPDATE SET value = EXCLUDED.value`,
        [year, locId, indicatorId, value, sourceId]
      );
      loaded++;
    } catch (e) {
      // skip bad rows
    }
  }
  console.log(`Loaded ${loaded} observations for ${indicatorCode}`);
}

// Standalone runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  runETL(pool)
    .then(() => pool.end())
    .catch(console.error);
}
