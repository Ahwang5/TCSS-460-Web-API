import { types } from 'pg';
import * as pg from 'pg';

// Override the wrapSSL function to force SSL
const Pool = pg.Pool;
const originalPool = Pool;

// @ts-expect-error - Extend Pool to always use SSL
pg.Pool = function(config) {
    if (config && config.connectionString && config.connectionString.includes('amazonaws.com')) {
        console.log('Adding SSL configuration to PostgreSQL connection');
        config.ssl = { rejectUnauthorized: false };
    }
    return new originalPool(config);
};

console.log('PostgreSQL SSL patch applied');