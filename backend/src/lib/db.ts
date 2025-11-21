import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('⚠️  WARNING: DATABASE_URL environment variable is not set!');
  console.error('⚠️  Please set DATABASE_URL in your .env file');
  console.error('⚠️  Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/robotops');
  console.error('⚠️  Server will continue but database operations will fail');
  // Don't exit in development to allow server to start and show better errors
  // process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Increased timeout
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error: any) {
    console.error('Database query error', { 
      text: text.substring(0, 100), // Truncate long queries
      error: error.message,
      code: error.code,
    });
    // Provide more helpful error messages
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Database connection refused. Is PostgreSQL running?');
    }
    if (error.code === 'EACCES') {
      throw new Error('Database access denied. Check your DATABASE_URL and credentials.');
    }
    if (error.code === '42P01') {
      throw new Error('Database table does not exist. Run migrations: npm run db:migrate');
    }
    throw error;
  }
}

export async function getClient() {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);
  
  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);
  
  // Monkey patch the query method to keep track of the last query executed
  client.query = (...args: any[]) => {
    client.lastQuery = args;
    return query(...args);
  };
  
  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release();
  };
  
  return client;
}

export default pool;

