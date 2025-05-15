import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';

interface Book {
    id: string;
    isbn13: string;
    authors: string;
    publication_year: string;
    original_title: string;
    title: string;
    rating_avg: string;
    rating_count: string;
    rating_1_star: string;
    rating_2_star: string;
    rating_3_star: string;
    rating_4_star: string;
    rating_5_star: string;
    image_url: string;
    image_small_url: string;
}

async function cleanBooksCSV() {
    try {
        // Read the CSV file
        console.log('Reading books.csv...');
        const csvFilePath = path.join(__dirname, '../data/books.csv');
        const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
        
        // Parse CSV
        const records: Book[] = await new Promise((resolve, reject) => {
            parse(fileContent, {
                columns: true,
                skip_empty_lines: true
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data as Book[]);
            });
        });
        
        // Get initial count
        const initialCount = records.length;
        console.log(`Initial number of records: ${initialCount}`);
        
        // Remove duplicates based on isbn13
        console.log('Removing duplicates...');
        const uniqueBooks = new Map<string, Book>();
        records.forEach(book => {
            if (book.isbn13 && !uniqueBooks.has(book.isbn13)) {
                uniqueBooks.set(book.isbn13, book);
            }
        });
        
        // Convert Map back to array
        const cleanedRecords = Array.from(uniqueBooks.values());
        
        // Get final count
        const finalCount = cleanedRecords.length;
        console.log(`Final number of records: ${finalCount}`);
        console.log(`Removed ${initialCount - finalCount} duplicate records`);
        
        // Create backup of original file
        console.log('Creating backup of original file...');
        fs.renameSync(csvFilePath, `${csvFilePath}.backup`);
        
        // Save cleaned data
        console.log('Saving cleaned data...');
        const output = await new Promise<string>((resolve, reject) => {
            stringify(cleanedRecords, {
                header: true,
                columns: Object.keys(records[0])
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
        
        fs.writeFileSync(csvFilePath, output);
        console.log('Done! Cleaned data saved to books.csv');
    } catch (error) {
        console.error('Error:', error);
    }
}

cleanBooksCSV(); 