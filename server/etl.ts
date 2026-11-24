import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function seedSources() {
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

async function seedIndicators() {
  await pool.query(`
    INSERT INTO indicators (code, name, category, unit, description)
    VALUES
      ('homicide_rate_per_100k', 'Intentional homicide rate', 'crime', 'per 100,000', 'UNODC via OWID'),
      ('conflict_deaths', 'Battle-related deaths', 'conflict', 'count', 'UCDP / OWID'),
      ('calorie_supply', 'Average daily calorie supply', 'diet', 'kcal/person/day', 'FAO via OWID')
    ON CONFLICT (code) DO NOTHING
  `);
  console.log('Seeded indicators');
}

async function fetchAndLoadOwidHomicide() {
  const url = 'https://ourworldindata.org/grapher/homicide-rate-unodc.csv?v=1&csvType=full&useColumnShortNames=true';
  console.log('Fetching OWID homicide data...');
  const res = await fetch(url, { headers: { 'User-Agent': 'GPI-ETL/1.0' } });
  if (!res.ok) throw new Error(`OWID fetch failed: ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  console.log('OWID headers sample:', headers.slice(0, 6));

  const sourceRes = await pool.query(`SELECT id FROM data_sources WHERE name = 'Our World in Data'`);
  const sourceId = sourceRes.rows[0]?.id;
  const indRes = await pool.query(`SELECT id FROM indicators WHERE code = 'homicide_rate_per_100k'`);
  const indicatorId = indRes.rows[0]?.id;
  if (!sourceId || !indicatorId) return;

  let loaded = 0;
  for (const line of lines.slice(1, 500)) {
    const cols = line.split(',');
    if (cols.length < 4) continue;
    const entity = cols[0];
    const year = parseInt(cols[2], 10);
    const value = parseFloat(cols[3]);
    if (!entity || isNaN(year) || isNaN(value)) continue;

    const loc = await pool.query(
      `INSERT INTO locations (name, level, iso3) VALUES ($1, 'country', $2)
       ON CONFLICT DO NOTHING RETURNING id`,
      [entity, cols[1] || null]
    );
    let locId = loc.rows[0]?.id;
    if (!locId) {
      const existing = await pool.query(`SELECT id FROM locations WHERE name = $1 AND level = 'country'`, [entity]);
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
  }
  console.log(`Loaded ${loaded} OWID homicide observations (sample)`);
}

async function main() {
  const schema = fs.readFileSync('./schema/postgres_postgis.sql', 'utf8');
  await pool.query(schema);
  await seedSources();
  await seedIndicators();
  await fetchAndLoadOwidHomicide();
  await pool.end();
  console.log('ETL bootstrap complete');
}

main().catch(console.error);
