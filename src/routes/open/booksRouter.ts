import { Router, Request, Response, NextFunction } from 'express';
import { pool, isStringProvided, isNumberProvided } from '../../core/utilities';
import { IBook, IRatings } from '../../types';

interface BookRecord {
    id: number;
    isbn13: string;
    authors: string;
    publication_year: number;
    original_title?: string;
    title?: string;
    image_url?: string;
    image_small_url?: string;
    rating_avg?: number;
    rating_count?: number;
    rating_1_star?: number;
    rating_2_star?: number;
    rating_3_star?: number;
    rating_4_star?: number;
    rating_5_star?: number;
}
const booksRouter: Router = Router();

/**
 * Gets rating counts for a book
 */
async function getRatingCounts(bookId: number): Promise<IRatings> {
    const sqlQuery = `
        SELECT
            rating_avg as average,
            rating_count as count,
      rating_1_star as rating_1,
      rating_2_star as rating_2,
      rating_3_star as rating_3,
      rating_4_star as rating_4,
      rating_5_star as rating_5
        FROM books
        WHERE id = $1
    `;
    const result = await pool.query(sqlQuery, [bookId]);
    return {
        average: parseFloat(result.rows[0].average || 0),
        count: parseInt(result.rows[0].count || 0),
        rating_1: parseInt(result.rows[0].rating_1 || 0),
        rating_2: parseInt(result.rows[0].rating_2 || 0),
        rating_3: parseInt(result.rows[0].rating_3 || 0),
        rating_4: parseInt(result.rows[0].rating_4 || 0),
        rating_5: parseInt(result.rows[0].rating_5 || 0)
    };
}

/**
 * Formats a database record into the required interface
 */
async function formatRecord(record: BookRecord): Promise<IBook> {
    return {
        id: record.id,
        isbn13: parseInt(record.isbn13.toString()),
        authors: record.authors,
        publication: record.publication_year,
        original_title: record.original_title || '',
        title: record.title || record.original_title || '', // Use title if available, fallback to original_title
        ratings: {
            average: record.rating_avg || 0,
            count: record.rating_count || 0,
            rating_1: record.rating_1_star || 0,
            rating_2: record.rating_2_star || 0,
            rating_3: record.rating_3_star || 0,
            rating_4: record.rating_4_star || 0,
            rating_5: record.rating_5_star || 0
        },
        icons: {
            large: record.image_url || '',
            small: record.image_small_url || ''
        }
    };
}

/**
 * Validates that the ISBN path param is 10–13 digits
 */
function validateIsbnFormat(req: Request, res: Response, next: NextFunction) {
    const isbnString = req.params.isbn;
    if (/^[0-9]{10,13}$/.test(isbnString)) {
        return next();
    }
    res.status(400).json({ message: 'Invalid ISBN format.' });
}

/**
 * Ensures that the author name is provided in the request body
 */
function validateAuthorName(req: Request, res: Response, next: NextFunction) {
    const rawAuthor = req.params.author;
    const authorName = decodeURIComponent(rawAuthor);
    if (isStringProvided(authorName)) {
        return next();
    }
    console.error('Author validation failed');
    res
        .status(400)
        .json({ message: 'Invalid author name – please check the docs.' });
}

/**
 * Validates required fields for creating a book
 */
function validatebookData(req: Request, res: Response, next: NextFunction) {
    const { isbn, authors, publication_year, original_title, title, image_url, small_image_url } = req.body;
    if (
        !isStringProvided(isbn) ||
        !isStringProvided(authors) ||
        !isNumberProvided(publication_year) ||
        !isStringProvided(original_title) ||
        !isStringProvided(title) ||
        !isStringProvided(image_url) ||
        !isStringProvided(small_image_url)
    ) {
        return res.status(400).json({ message: 'Invalid book data – please check the docs.' });
    }
    next();
}

/**
 * Validates that the book's Rating is between 0 and 5
 */
function validatebookRating(req: Request, res: Response, next: NextFunction) {
    const rating = req.body.rating;
    if (rating < 0 || rating > 5) {
        return res.status(400).json({ message: 'Invalid book rating – please check the docs.' });
    }
    next();
}

/**
 * @api {get} /books/author/:author   Get books by author
 * @apiName GetByAuthor
 * @apiGroup books
 *
 * @apiParam  {String} author   URL-encoded author name
 *
 * @apiSuccess {Object[]} books     Matching book records
 * @apiSuccess {BigInt}   books.isbn13
 * @apiSuccess {String}   books.authors
 * @apiSuccess {Number}   books.publication
 * @apiSuccess {String}   books.original_title
 * @apiSuccess {String}   books.title
 * @apiSuccess {Object}   books.ratings
 * @apiSuccess {Number}   books.ratings.average
 * @apiSuccess {Number}   books.ratings.count
 * @apiSuccess {Number}   books.ratings.rating_1
 * @apiSuccess {Number}   books.ratings.rating_2
 * @apiSuccess {Number}   books.ratings.rating_3
 * @apiSuccess {Number}   books.ratings.rating_4
 * @apiSuccess {Number}   books.ratings.rating_5
 * @apiSuccess {Object}   books.icons
 * @apiSuccess {String}   books.icons.large
 * @apiSuccess {String}   books.icons.small
 *
 * @apiError   (404) {String} message  "Author not found"
 * @apiError   (500) {String} message  "Server error – contact support"
 */
booksRouter.get(
    '/author/:author',
    validateAuthorName,
    async (req: Request, res: Response) => {
        try {
            const { author } = req.params;
            const query = `
                SELECT
                    id,
                    isbn13,
                    original_title,
                    title,
                    authors,
                    publication_year,
                    image_url,
                    image_small_url,
                    rating_avg,
                    rating_count,
                    rating_1_star,
                    rating_2_star,
                    rating_3_star,
                    rating_4_star,
                    rating_5_star
                FROM books
                WHERE authors ILIKE $1
                ORDER BY original_title
            `;
            const result = await pool.query(query, [`%${author}%`]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'No books found for this author' });
            }

            const books = await Promise.all(result.rows.map(formatRecord));
            return res.json({ books });
        } catch (error) {
            console.error('Error getting books by author:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
);

/**
 * @api {get} /books/isbn/:isbn       Get a book by ISBN
 * @apiName GetByIsbn
 * @apiGroup books
 *
 * @apiParam  {String} isbn    10–13 digit ISBN
 *
 * @apiSuccess {Object} book
 * @apiSuccess {Number} book.book_id
 * @apiSuccess {BigInt} book.isbn13
 * @apiSuccess {Number} book.original_publication_year
 * @apiSuccess {String} book.original_title
 * @apiSuccess {String} book.title
 * @apiSuccess {String} book.image_url
 * @apiSuccess {String} book.small_image_url
 *
 * @apiError   (400) {String} message  "Invalid ISBN format."
 * @apiError   (404) {String} message  "book not found"
 * @apiError   (500) {String} message  "Server error – contact support"
 */
booksRouter.get(
    '/isbn/:isbn',
    validateIsbnFormat,
    async (req: Request, res: Response) => {
        const isbnString = req.params.isbn;

        const sqlQuery = `
            SELECT
                id,
                isbn13,
                original_title,
                title,
                authors,
                publication_year,
                image_url,
                image_small_url,
                rating_avg,
                rating_count,
                rating_1_star,
                rating_2_star,
                rating_3_star,
                rating_4_star,
                rating_5_star
            FROM books
            WHERE isbn13 = $1
        `;
        const sqlParams = [isbnString];

        try {
            const queryResult = await pool.query(sqlQuery, sqlParams);
            if (queryResult.rowCount > 0) {
                const book = await formatRecord(queryResult.rows[0]);
                return res.json({ book });
            }
            res.status(404).json({ message: 'book not found' });
        } catch (err) {
            console.error('Error fetching book by ISBN', err);
            res.status(500).json({ message: 'Server error – contact support' });
        }
    }
);

/**
 * @api {post} /books       Create a book
 * @apiName Createbook
 * @apiGroup books
 *
 * @apiBody  {String}  isbn            10–13 digit ISBN
 * @apiBody  {String}  authors           Comma-separated author names
 * @apiBody  {Number}  publication_year  Publication year
 * @apiBody  {String}  original_title    Original title
 * @apiBody  {String}  title             Title
 * @apiBody  {String}  image_url         URL of book image
 * @apiBody  {String}  small_image_url   URL of small book image
 *
 * @apiSuccess (201) {Object} book        The created book record
 *
 * @apiError   (400) {String} message     Validation error – please check the docs.
 * @apiError   (500) {String} message     Server error – contact support
 */
booksRouter.post(
    '/',
    validatebookData,
    async (req: Request, res: Response) => {
        const { isbn, authors, publication_year, original_title, title, image_url, small_image_url } = req.body;

        try {
            // Generate a new ID since `id` has no default sequence
            const maxRes = await pool.query('SELECT MAX(id) as maxid FROM books');
            const newId = (maxRes.rows[0].maxid || 0) + 1;

            const sqlQuery = `
          INSERT INTO books (id, isbn13, authors, publication_year, original_title, title, image_url, image_small_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              RETURNING *;
      `;
            const sqlParams = [
                newId,
                isbn.toString(),
                authors,
                publication_year,
                original_title,
                title,
                image_url,
                small_image_url
            ];

            const queryResult = await pool.query(sqlQuery, sqlParams);
            return res.status(201).json({ book: queryResult.rows[0] });
        } catch (err) {
            console.error('Error creating book', err);
            res.status(500).json({ message: 'Server error – contact support' });
        }
    }
);

/**
 * @api {patch} /books/rating       Update a book rating
 * @apiName UpdatebookRating
 * @apiGroup books
 *
 * @apiBody  {Number}  book_id     ID of the book to update rating for
 * @apiBody  {Number}  rating      New rating value (0-5)
 *
 * @apiSuccess (200) {Object} rating        The updated rating record
 *
 * @apiError   (400) {String} message       Invalid rating value
 * @apiError   (404) {String} message       book not found
 * @apiError   (500) {String} message       Server error – contact support
 */
booksRouter.patch(
    '/rating',
    validatebookRating,
    async (req: Request, res: Response) => {
        console.log('Rating update endpoint hit with data:', req.body);
        try {
            const { book_id, rating } = req.body;

            // First check if the book exists
            const bookCheckQuery = 'SELECT id FROM books WHERE id = $1';
            const bookCheckResult = await pool.query(bookCheckQuery, [book_id]);

            if (bookCheckResult.rowCount === 0) {
                return res.status(404).json({ message: 'book not found' });
            }

            // Update or insert the rating
            const sqlQuery = `
                INSERT INTO book_rating (book_id, account_id, rating, review_text)
                VALUES ($1, 1, $2, 'Updated via API')
                    ON CONFLICT (book_id, account_id) 
        DO UPDATE SET rating = $2
                                   RETURNING *;
            `;
            const sqlParams = [book_id, rating];

            console.log('Executing query:', sqlQuery, sqlParams);
            const queryResult = await pool.query(sqlQuery, sqlParams);
            console.log('Query result:', queryResult.rows[0]);

            return res.status(200).json({ rating: queryResult.rows[0] });
        } catch (err) {
            console.error('Error updating book rating', err);
            res.status(500).json({ message: 'Server error – contact support' });
        }
    }
);

/**
 * @api {get} /books       Get all books with pagination
 * @apiName GetAllbooks
 * @apiGroup books
 *
 * @apiQuery {Number} [page=1]     Page number
 * @apiQuery {Number} [limit=10]   Number of books per page
 *
 * @apiSuccess {Object[]} books    Array of book records
 * @apiSuccess {Number}   total    Total number of books
 * @apiSuccess {Number}   page     Current page number
 * @apiSuccess {Number}   limit    Number of books per page
 * @apiSuccess {Number}   pages    Total number of pages
 */
booksRouter.get(
    '/',
    async (req: Request, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const offset = (page - 1) * limit;

            const countQuery = 'SELECT COUNT(*) FROM books';
            const booksQuery = `
                SELECT
                    id,
                    isbn13,
                    original_title,
                    title,
                    authors,
                    publication_year,
                    image_url,
                    image_small_url,
                    rating_avg,
                    rating_count,
                    rating_1_star,
                    rating_2_star,
                    rating_3_star,
                    rating_4_star,
                    rating_5_star
                FROM books
                ORDER BY original_title
                    LIMIT $1 OFFSET $2
            `;

            const [countResult, booksResult] = await Promise.all([
                pool.query(countQuery),
                pool.query(booksQuery, [limit, offset])
            ]);

            const total = parseInt(countResult.rows[0].count);
            const pages = Math.ceil(total / limit);
            const books = await Promise.all(booksResult.rows.map(formatRecord));

            return res.json({
                books,
                total,
                page,
                limit,
                pages
            });
        } catch (error) {
            console.error('Error getting books:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
);

/**
 * @api {delete} /books/isbn/:isbn       Delete a book by ISBN
 * @apiName DeleteByIsbn
 * @apiGroup books
 *
 * @apiParam  {String} isbn    10–13 digit ISBN
 *
 * @apiSuccess {String} message  "book deleted successfully"
 *
 * @apiError   (400) {String} message  "Invalid ISBN format."
 * @apiError   (404) {String} message  "book not found"
 * @apiError   (500) {String} message  "Server error – contact support"
 */
booksRouter.delete(
    '/isbn/:isbn',
    validateIsbnFormat,
    async (req: Request, res: Response) => {
        const isbnString = req.params.isbn;

        try {
            // First check if the book exists
            const checkQuery = 'SELECT id FROM books WHERE isbn13 = $1';
            const checkResult = await pool.query(checkQuery, [isbnString]);

            if (checkResult.rowCount === 0) {
                return res.status(404).json({ message: 'book not found' });
            }

            const bookId = checkResult.rows[0].id; // Fixed: was book_id, should be id

            // Delete ratings first (due to foreign key constraint)
            const deleteRatingsQuery = 'DELETE FROM book_rating WHERE book_id = $1';
            await pool.query(deleteRatingsQuery, [bookId]);

            // Delete the book
            const deleteQuery = 'DELETE FROM books WHERE isbn13 = $1';
            await pool.query(deleteQuery, [isbnString]);

            return res.status(200).json({ message: 'book deleted successfully' });
        } catch (err) {
            console.error('Error deleting book by ISBN', err);
            res.status(500).json({ message: 'Server error – contact support' });
        }
    }
);

/**
 * @api {delete} /books/range       Delete books by ISBN range
 * @apiName DeleteByRange
 * @apiGroup books
 *
 * @apiBody  {String}  start_isbn  Starting ISBN in range
 * @apiBody  {String}  end_isbn    Ending ISBN in range
 *
 * @apiSuccess {String} message        "books deleted successfully"
 * @apiSuccess {Number} deleted_count  Number of books deleted
 * @apiSuccess {String[]} deleted_isbns  List of deleted book ISBNs
 *
 * @apiError   (400) {String} message  "Missing start_isbn or end_isbn"
 * @apiError   (404) {String} message  "No books found in range"
 * @apiError   (500) {String} message  "Server error – contact support"
 */
booksRouter.delete(
    '/range',
    async (req: Request, res: Response) => {
        const { start_isbn, end_isbn } = req.body;

        if (!start_isbn || !end_isbn) {
            return res.status(400).json({ message: 'Missing start_isbn or end_isbn' });
        }

        try {
            // First get all book IDs in the range
            const getbooksQuery = 'SELECT id FROM books WHERE isbn13 BETWEEN $1 AND $2';
            const booksResult = await pool.query(getbooksQuery, [start_isbn.toString(), end_isbn.toString()]);

            if (booksResult.rowCount === 0) {
                return res.status(404).json({ message: 'No books found in range' });
            }

            const bookIds = booksResult.rows.map(row => row.id); // Fixed: was book_id, should be id

            // Delete ratings first (due to foreign key constraint)
            const deleteRatingsQuery = 'DELETE FROM book_rating WHERE book_id = ANY($1)';
            await pool.query(deleteRatingsQuery, [bookIds]);

            // Delete books in range and return their ISBNs
            const deleteQuery = 'DELETE FROM books WHERE id = ANY($1) RETURNING isbn13';
            const result = await pool.query(deleteQuery, [bookIds]);

            return res.status(200).json({
                message: 'books deleted successfully',
                deleted_count: result.rowCount,
                deleted_isbns: result.rows.map(row => row.isbn13) // Fixed: was isbn, should be isbn13
            });
        } catch (err) {
            console.error('Error deleting books by range', err);
            res.status(500).json({ message: 'Server error – contact support' });
        }
    }
);

/**
 * Ensures that the title is provided in the request params
 */
function validateTitle(req: Request, res: Response, next: NextFunction) {
    const rawTitle = req.params.title;
    const title = decodeURIComponent(rawTitle);
    if (isStringProvided(title)) {
        return next();
    }
    console.error('Title validation failed');
    res
        .status(400)
        .json({ message: 'Invalid title – please check the docs.' });
}

/**
 * @api {get} /books/title/:title   Get books by title
 * @apiName GetByTitle
 * @apiGroup books
 *
 * @apiParam  {String} title   URL-encoded book title
 *
 * @apiSuccess {Object[]} books     Matching book records
 * @apiSuccess {BigInt}   books.isbn13
 * @apiSuccess {String}   books.authors
 * @apiSuccess {Number}   books.publication
 * @apiSuccess {String}   books.original_title
 * @apiSuccess {String}   books.title
 * @apiSuccess {Object}   books.ratings
 * @apiSuccess {Number}   books.ratings.average
 * @apiSuccess {Number}   books.ratings.count
 * @apiSuccess {Number}   books.ratings.rating_1
 * @apiSuccess {Number}   books.ratings.rating_2
 * @apiSuccess {Number}   books.ratings.rating_3
 * @apiSuccess {Number}   books.ratings.rating_4
 * @apiSuccess {Number}   books.ratings.rating_5
 * @apiSuccess {Object}   books.icons
 * @apiSuccess {String}   books.icons.large
 * @apiSuccess {String}   books.icons.small
 *
 * @apiError   (404) {String} message  "No books found with that title"
 * @apiError   (500) {String} message  "Server error – contact support"
 */
booksRouter.get(
    '/title/:title',
    validateTitle,
    async (req: Request, res: Response) => {
        try {
            const { title } = req.params;
            const query = `
                SELECT
                    id,
                    isbn13,
                    original_title,
                    title,
                    authors,
                    publication_year,
                    image_url,
                    image_small_url,
                    rating_avg,
                    rating_count,
                    rating_1_star,
                    rating_2_star,
                    rating_3_star,
                    rating_4_star,
                    rating_5_star
                FROM books
                WHERE original_title ILIKE $1
                ORDER BY original_title
            `;
            const result = await pool.query(query, [`%${title}%`]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'No books found with this title' });
            }

            const books = await Promise.all(result.rows.map(formatRecord));
            return res.json({ books });
        } catch (error) {
            console.error('Error getting books by title:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
);

/**
 * Validates that the rating is a number between 1 and 5
 */
function validateRatingParam(req: Request, res: Response, next: NextFunction) {
    const rating = parseFloat(req.params.rating);
    if (!isNaN(rating) && rating >= 1 && rating <= 5) {
        return next();
    }
    console.error('Rating validation failed');
    res
        .status(400)
        .json({ error: 'Invalid rating – must be between 1 and 5.' });
}

/**
 * @api {get} /books/rating/:rating   Get books by rating
 * @apiName GetByRating
 * @apiGroup books
 *
 * @apiParam  {Number} rating   Rating value (1-5)
 *
 * @apiSuccess {Object[]} books     Matching book records with an average rating within +/- 0.2 of the specified rating.
 * @apiSuccess {BigInt}   books.isbn13
 * @apiSuccess {String}   books.authors
 * @apiSuccess {Number}   books.publication
 * @apiSuccess {String}   books.original_title
 * @apiSuccess {String}   books.title
 * @apiSuccess {Object}   books.ratings
 * @apiSuccess {Number}   books.ratings.average
 * @apiSuccess {Number}   books.ratings.count
 * @apiSuccess {Number}   books.ratings.rating_1
 * @apiSuccess {Number}   books.ratings.rating_2
 * @apiSuccess {Number}   books.ratings.rating_3
 * @apiSuccess {Number}   books.ratings.rating_4
 * @apiSuccess {Number}   books.ratings.rating_5
 * @apiSuccess {Object}   books.icons
 * @apiSuccess {String}   books.icons.large
 * @apiSuccess {String}   books.icons.small
 *
 * @apiError   (400) {String} message  "Invalid rating – must be between 1 and 5"
 * @apiError   (404) {String} message  "No books found with that rating"
 * @apiError   (500) {String} message  "Server error – contact support"
 */
booksRouter.get(
    '/rating/:rating',
    validateRatingParam,
    async (req: Request, res: Response) => {
        const rating = parseFloat(req.params.rating);
        // Find books with ratings within 0.2 of the specified rating
        const lowerBound = rating - 0.2;
        const upperBound = rating + 0.2;

        const query = `
            SELECT
                id,
                isbn13,
                original_title,
                title,
                authors,
                publication_year,
                image_url,
                image_small_url,
                rating_avg,
                rating_count,
                rating_1_star,
                rating_2_star,
                rating_3_star,
                rating_4_star,
                rating_5_star
            FROM books
            WHERE rating_avg BETWEEN $1 AND $2
            ORDER BY original_title
        `;

        try {
            const result = await pool.query(query, [lowerBound, upperBound]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'No books found with that rating' });
            }
            const books = await Promise.all(result.rows.map(formatRecord));
            res.json({ books });
        } catch (err) {
            console.error('Database query error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

/**
 * Validates that the year is a valid number
 */
function validateYear(req: Request, res: Response, next: NextFunction) {
    const year = parseInt(req.params.year);
    if (!isNaN(year) && year > 0) {
        return next();
    }
    console.error('Year validation failed');
    res
        .status(400)
        .json({ error: 'Invalid year – must be a positive number.' });
}

/**
 * @api {get} /books/year/:year   Get books by publication year
 * @apiName GetByYear
 * @apiGroup books
 *
 * @apiParam  {Number} year   Publication year
 *
 * @apiSuccess {Object[]} books     Matching book records
 * @apiSuccess {BigInt}   books.isbn13
 * @apiSuccess {String}   books.authors
 * @apiSuccess {Number}   books.publication
 * @apiSuccess {String}   books.original_title
 * @apiSuccess {String}   books.title
 * @apiSuccess {Object}   books.ratings
 * @apiSuccess {Number}   books.ratings.average
 * @apiSuccess {Number}   books.ratings.count
 * @apiSuccess {Number}   books.ratings.rating_1
 * @apiSuccess {Number}   books.ratings.rating_2
 * @apiSuccess {Number}   books.ratings.rating_3
 * @apiSuccess {Number}   books.ratings.rating_4
 * @apiSuccess {Number}   books.ratings.rating_5
 * @apiSuccess {Object}   books.icons
 * @apiSuccess {String}   books.icons.large
 * @apiSuccess {String}   books.icons.small
 *
 * @apiError   (400) {String} message  "Invalid year – must be a positive number"
 * @apiError   (404) {String} message  "No books found from that year"
 * @apiError   (500) {String} message  "Server error – contact support"
 */
booksRouter.get(
    '/year/:year',
    validateYear,
    async (req: Request, res: Response) => {
        const year = parseInt(req.params.year);
        if (isNaN(year) || year < 0) {
            return res.status(400).json({ error: 'Year must be a positive number' });
        }

        const query = `
            SELECT
                id,
                isbn13,
                original_title,
                title,
                authors,
                publication_year,
                image_url,
                image_small_url,
                rating_avg,
                rating_count,
                rating_1_star,
                rating_2_star,
                rating_3_star,
                rating_4_star,
                rating_5_star
            FROM books
            WHERE publication_year = $1
            ORDER BY original_title
        `;
        try {
            const result = await pool.query(query, [year]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'No books found for this year' });
            }
            const books = await Promise.all(result.rows.map(formatRecord));
            res.json({ books });
        } catch (err) {
            console.error('Database query error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

export { booksRouter };