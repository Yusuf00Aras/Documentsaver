import 'dotenv/config'
import pg  from 'pg';

export const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
pool.on('error', (err) => {
  console.error('[DB] Unexpected error:', err);
});


export const query = (text, params) => pool.query(text, params);

export const getClient = () => pool.connect();
