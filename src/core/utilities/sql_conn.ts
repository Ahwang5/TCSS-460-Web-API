// Obtain a Pool of DB connections.
import { Pool, PoolConfig } from 'pg';

const pgConfig: PoolConfig = process.env.DATABASE_URL
    ? {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      }
    : {
          host: process.env.PGHOST || 'localhost',
          port: parseInt(process.env.PGPORT || '5432', 10),
          user: process.env.PGUSER || 'tcss460',
          database: process.env.PGDATABASE || 'tcss460',
          password: process.env.PGPASSWORD || 'ads123',
          ssl: false
      };

const pool = new Pool(pgConfig);

export { pool };
