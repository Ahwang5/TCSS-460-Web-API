// Obtain a Pool of DB connections.
import { Pool, PoolConfig } from 'pg';

const pgConfig: PoolConfig = process.env.DATABASE_URL
    ? {
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
      }
    : {
          host: process.env.PGHOST || 'localhost',
          port: parseInt(process.env.PGPORT || '5432', 10),
          user: process.env.PGUSER || 'tcss460',
          database: process.env.PGDATABASE || 'tcss460',
          password: process.env.PGPASSWORD || 'ads123',
          ssl: false
      };

console.log('Database configuration:', {
    ...pgConfig,
    password: pgConfig.password ? '[REDACTED]' : undefined
});

const pool = new Pool(pgConfig);

// Add error handling
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit the process, just log the error
    console.error('Database pool error:', err);
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        // Don't exit the process, just log the error
        console.error('Database connection error:', err);
    } else {
        console.log('Database connected successfully');
    }
});

export { pool };
