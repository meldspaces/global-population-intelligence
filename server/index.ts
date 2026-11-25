import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { runETL } from './etl.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

// Serve built frontend in production
const clientDist = path.join(__dirname, '..', 'dist');
try {
  await app.register(fastifyStatic, {
    root: clientDist,
    prefix: '/'
  });
} catch (e) {
  console.log('Static files not found (dev mode or not built yet)');
}

app.get('/api/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

app.get('/api/sources', async () => {
  const { rows } = await pool.query('SELECT * FROM data_sources ORDER BY name');
  return rows;
});

app.get('/api/indicators', async () => {
  const { rows } = await pool.query('SELECT * FROM indicators ORDER BY category, name');
  return rows;
});

app.get('/api/observations', async (req) => {
  const q = req.query as { indicator?: string; country?: string; limit?: string };
  const limit = Math.min(Number(q.limit) || 200, 1000);
  let sql = `
    SELECT o.year, o.value, l.name AS location, i.code AS indicator, i.name AS indicator_name
    FROM observations o
    JOIN locations l ON l.id = o.location_id
    JOIN indicators i ON i.id = o.indicator_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (q.indicator) {
    params.push(q.indicator);
    sql += ` AND i.code = $${params.length}`;
  }
  if (q.country) {
    params.push(`%${q.country}%`);
    sql += ` AND l.name ILIKE $${params.length}`;
  }
  sql += ` ORDER BY o.year DESC, l.name LIMIT $${params.length + 1}`;
  params.push(limit);
  const { rows } = await pool.query(sql, params);
  return rows;
});

// Auto-run ETL if observations table is empty
async function ensureData() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM observations');
    if (rows[0].n === 0) {
      console.log('Observations empty — running ETL...');
      await runETL(pool);
      console.log('Initial ETL finished');
    } else {
      console.log(`Observations already populated (${rows[0].n} rows)`);
    }
  } catch (err) {
    console.warn('ETL check/run failed (schema may not exist yet):', err);
    try {
      await runETL(pool);
    } catch (e) {
      console.error('ETL failed:', e);
    }
  }
}

const port = Number(process.env.PORT) || 8080;
await app.listen({ port, host: '0.0.0.0' });
console.log(`GPI API + frontend listening on ${port}`);

// Run data check after server is listening
ensureData().catch(console.error);
