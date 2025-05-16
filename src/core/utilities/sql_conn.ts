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

const pool = new Pool(pgConfig);

// Add error handling
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        process.exit(-1);
    }
    console.log('Database connected successfully');
});

export { pool };
