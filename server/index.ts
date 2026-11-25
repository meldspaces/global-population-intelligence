import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { runETL } from './etl.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let etlStatus = {
  running: false,
  lastStarted: null as string | null,
  lastFinished: null as string | null,
  lastError: null as string | null,
  message: 'idle'
};

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const possibleDists = [
  path.join(__dirname, '..', 'dist'),
  path.join(process.cwd(), 'dist'),
  path.join(process.cwd(), 'client', 'dist')
];
const clientDist = possibleDists.find(p => fs.existsSync(path.join(p, 'index.html'))) || possibleDists[0];

console.log('Serving static from:', clientDist, 'exists:', fs.existsSync(clientDist));

if (fs.existsSync(clientDist)) {
  await app.register(fastifyStatic, {
    root: clientDist,
    prefix: '/',
    decorateReply: false
  });

  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith('/api/')) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return reply.sendFile('index.html', clientDist);
  });
}

app.get('/api/health', async () => ({ status: 'ok', time: new Date().toISOString(), dist: clientDist, etl: etlStatus }));

app.get('/api/status', async () => {
  try {
    const sources = await pool.query(`
      SELECT s.name, s.last_checked, s.trust_score,
             COUNT(o.id)::int AS observation_count
      FROM data_sources s
      LEFT JOIN observations o ON o.source_id = s.id
      GROUP BY s.id, s.name, s.last_checked, s.trust_score
      ORDER BY s.name
    `);
    const total = await pool.query('SELECT COUNT(*)::int AS n FROM observations');
    return {
      etl: etlStatus,
      totalObservations: total.rows[0]?.n ?? 0,
      sources: sources.rows
    };
  } catch (err) {
    return { etl: etlStatus, totalObservations: 0, sources: [], error: String(err) };
  }
});

app.get('/api/sources', async () => {
  try {
    const { rows } = await pool.query('SELECT * FROM data_sources ORDER BY name');
    return rows;
  } catch { return []; }
});

app.get('/api/indicators', async () => {
  try {
    const { rows } = await pool.query('SELECT * FROM indicators ORDER BY category, name');
    return rows;
  } catch { return []; }
});

app.get('/api/observations', async (req) => {
  const q = req.query as { indicator?: string; country?: string; limit?: string };
  const limit = Math.min(Number(q.limit) || 200, 1000);
  try {
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
  } catch { return []; }
});

async function ensureData() {
  etlStatus.running = true;
  etlStatus.lastStarted = new Date().toISOString();
  etlStatus.message = 'checking…';
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM observations');
    if (rows[0].n === 0) {
      etlStatus.message = 'running initial ETL';
      await runETL(pool);
      etlStatus.message = 'complete';
    } else {
      etlStatus.message = `already populated (${rows[0].n} rows)`;
    }
  } catch (err) {
    etlStatus.lastError = String(err);
    etlStatus.message = 'failed — retrying';
    try {
      await runETL(pool);
      etlStatus.message = 'complete after retry';
      etlStatus.lastError = null;
    } catch (e) {
      etlStatus.lastError = String(e);
      etlStatus.message = 'failed';
    }
  } finally {
    etlStatus.running = false;
    etlStatus.lastFinished = new Date().toISOString();
  }
}

const port = Number(process.env.PORT) || 8080;
await app.listen({ port, host: '0.0.0.0' });
console.log(`GPI API + frontend listening on ${port}`);

ensureData().catch(console.error);
