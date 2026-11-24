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

async function main() {
  const schema = fs.readFileSync('./schema/postgres_postgis.sql', 'utf8');
  await pool.query(schema);
  await seedSources();
  await pool.end();
  console.log('ETL bootstrap complete');
}

main().catch(console.error);
