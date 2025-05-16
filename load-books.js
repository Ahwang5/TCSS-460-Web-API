/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */
// unique-id-import.js
const fs = require('fs');
const { Pool } = require('pg');
const { parse } = require('csv-parse');
require('dotenv').config();

// Database connection
const dbUrl = process.env.DATABASE_URL;
console.log('Using database URL:', dbUrl ? 'Found in environment' : 'Not found');

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

// Path to CSV file
const csvFilePath = process.argv[2] || 'books.csv';
console.log(`Reading from CSV file: ${csvFilePath}`);

async function importBooks() {
    const client = await pool.connect();
    console.log('Connected to database');

    try {
        // First check the current count and max ID
        const initialCountResult = await client.query('SELECT COUNT(*) FROM books');
        const initialCount = parseInt(initialCountResult.rows[0].count);
        console.log(`Initial book count: ${initialCount}`);

        // Get the maximum ID currently in the database
        const maxIdResult = await client.query('SELECT MAX(id) FROM books');
        let startId = parseInt(maxIdResult.rows[0].max || '0') + 1;
        console.log(`Starting with ID: ${startId}`);

        // Process the CSV file
        const parser = parse({
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        let totalProcessed = 0;
        let currentBatch = [];
        const BATCH_SIZE = 100;

        // Create a promise to handle the file processing
        await new Promise((resolve, reject) => {
            const parser = parse({
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            parser.on('data', async (record) => {
                currentBatch.push({
                    id: startId + totalProcessed,
                    record
                });
                totalProcessed++;

                // Process in batches
                if (currentBatch.length >= BATCH_SIZE) {
                    parser.pause();

                    try {
                        await processBatch(client, currentBatch);
                        currentBatch = [];
                        parser.resume();
                    } catch (err) {
                        console.error('Error processing batch:', err);
                        parser.resume();
                    }
                }
            });

            parser.on('end', async () => {
                // Process any remaining records
                if (currentBatch.length > 0) {
                    try {
                        await processBatch(client, currentBatch);
                    } catch (err) {
                        console.error('Error processing final batch:', err);
                    }
                }

                resolve();
            });

            parser.on('error', (err) => {
                console.error('Error parsing CSV:', err);
                reject(err);
            });

            // Start the parsing
            fs.createReadStream(csvFilePath).pipe(parser);
        });

        // Final verification
        const finalCountResult = await client.query('SELECT COUNT(*) FROM books');
        const finalCount = parseInt(finalCountResult.rows[0].count);

        console.log(`\nImport complete!`);
        console.log(`Initial count: ${initialCount}`);
        console.log(`Records processed: ${totalProcessed}`);
        console.log(`Final count: ${finalCount}`);
        console.log(`Net new records: ${finalCount - initialCount}`);

    } catch (err) {
        console.error('Error in import process:', err);
    } finally {
        client.release();
        await pool.end();
        console.log('Database connection closed');
    }
}

async function processBatch(client, batch) {
    // Start a transaction
    await client.query('BEGIN');

    try {
        for (const item of batch) {
            const book = item.record;
            const id = item.id;

            // Extract book data with fallbacks
            const isbn13 = book.isbn13 || book.isbn || '';
            const title = book.title || book.original_title || '';
            const authors = book.authors || book.author || '';
            // FIX: Look for the correct column name - original_publication_year
            const publication_year = parseInt(book.original_publication_year || book.publication_year || book.year || '0') || null;
            const image_url = book.image_url || book.cover_url || '';
            const rating_avg = parseFloat(book.average_rating || book.rating_avg || '0') || 0;
            const rating_count = parseInt(book.ratings_count || book.rating_count || '0') || 0;
            const rating_1_star = parseInt(book.ratings_1 || book.rating_1 || '0') || 0;
            const rating_2_star = parseInt(book.ratings_2 || book.rating_2 || '0') || 0;
            const rating_3_star = parseInt(book.ratings_3 || book.rating_3 || '0') || 0;
            const rating_4_star = parseInt(book.ratings_4 || book.rating_4 || '0') || 0;
            const rating_5_star = parseInt(book.ratings_5 || book.rating_5 || '0') || 0;

            // Debug log to verify data
            console.log(`Processing book: ${title}, Year: ${publication_year}, Original CSV Year: ${book.original_publication_year}`);

            const query = `
                INSERT INTO books (
                    id, isbn13, original_title, authors, publication_year,
                    image_url, rating_avg, rating_count, rating_1_star,
                    rating_2_star, rating_3_star, rating_4_star, rating_5_star
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    ON CONFLICT (id) DO NOTHING
            `;

            await client.query(query, [
                id,
                isbn13,
                title,
                authors,
                publication_year,
                image_url,
                rating_avg,
                rating_count,
                rating_1_star,
                rating_2_star,
                rating_3_star,
                rating_4_star,
                rating_5_star
            ]);
        }

        // Commit the transaction
        await client.query('COMMIT');
        console.log(`Batch committed: ${batch.length} records`);

        // Verify after the batch
        const countResult = await client.query('SELECT COUNT(*) FROM books');
        console.log(`Current count: ${countResult.rows[0].count}`);

        return true;
    } catch (err) {
        // Rollback on error
        await client.query('ROLLBACK');
        console.error(`Transaction rolled back: ${err.message}`);
        throw err;
    }
}

// Start the import
importBooks().catch(err => console.error('Uncaught error:', err));