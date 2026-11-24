import Fastify from 'fastify';
import cors from '@fastify/cors';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get('/api/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

app.get('/api/sources', async () => {
  const { rows } = await pool.query('SELECT * FROM data_sources ORDER BY name');
  return rows;
});

app.get('/api/indicators', async () => {
  const { rows } = await pool.query('SELECT * FROM indicators ORDER BY category, name');
  return rows;
});

const port = Number(process.env.PORT) || 8080;
await app.listen({ port, host: '0.0.0.0' });
console.log(`GPI API listening on ${port}`);
