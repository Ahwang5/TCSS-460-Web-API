import { Router, Request, Response, NextFunction } from 'express';
import { pool, isStringProvided, isNumberProvided } from '../../core/utilities';
import { IBook, IRatings } from '../../types';

const booksRouter: Router = Router();

/**
 * Gets rating counts for a book
 */
async function getRatingCounts(bookId: number): Promise<IRatings> {
  const sqlQuery = `
    SELECT 
      COALESCE(AVG(rating), 0) as average,
      COUNT(*) as count,
      COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1,
      COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2,
      COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3,
      COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4,
      COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5
    FROM Book_Rating
    WHERE book_id = $1
  `;
  const result = await pool.query(sqlQuery, [bookId]);
  return {
    average: parseFloat(result.rows[0].average),
    count: parseInt(result.rows[0].count),
    rating_1: parseInt(result.rows[0].rating_1),
    rating_2: parseInt(result.rows[0].rating_2),
    rating_3: parseInt(result.rows[0].rating_3),
    rating_4: parseInt(result.rows[0].rating_4),
    rating_5: parseInt(result.rows[0].rating_5)
  };
}

/**
 * Formats a database record into the required interface
 */
async function formatRecord(record: any): Promise<IBook> {
  const ratings = await getRatingCounts(record.book_id);
  return {
    isbn13: parseInt(record.isbn),
    authors: record.author,
    publication: record.publication_year,
    original_title: record.original_title || record.title,
    title: record.title,
    ratings,
    icons: {
      large: record.icon_url_large || '',
      small: record.icon_url_small || ''
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
function validateBookData(req: Request, res: Response, next: NextFunction) {
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
 * Validates that the Book's Rating is between 0 and 5
 * 
 */
function validateBookRating(req: Request, res: Response, next: NextFunction) {
  const rating = req.body.rating;
  if (rating < 0 || rating > 5) {
    return res.status(400).json({ message: 'Invalid book rating – please check the docs.' });
  }
  next();
}

/**
 * @api {get} /books/author/:author   Get books by author
 * @apiName GetByAuthor
 * @apiGroup Books
 *
 * @apiParam  {String} author   URL-encoded author name
 *
 * @apiSuccess {Object[]} books     Matching book records
 * @apiSuccess {Number}   books.book_id
 * @apiSuccess {BigInt}   books.isbn13
 * @apiSuccess {Number}   books.original_publication_year
 * @apiSuccess {String}   books.original_title
 * @apiSuccess {String}   books.title
 * @apiSuccess {String}   books.image_url
 * @apiSuccess {String}   books.small_image_url
 * @apiSuccess {String}   books.formatted
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
          book_id,
          isbn,
          title,
          original_title,
          author,
          publication_year,
          icon_url_large,
          icon_url_small
        FROM Book
        WHERE author ILIKE $1
        ORDER BY title
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
 * @apiGroup Books
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
 * @apiError   (404) {String} message  "Book not found"
 * @apiError   (500) {String} message  "Server error – contact support"
 */
booksRouter.get(
  '/isbn/:isbn',
  validateIsbnFormat,
  async (req: Request, res: Response) => {
    const isbnString = req.params.isbn;

    const sqlQuery = `
      SELECT 
        book_id,
        isbn,
        title,
        original_title,
        author,
        publication_year,
        icon_url_large,
        icon_url_small
      FROM Book
      WHERE isbn = $1
    `;
    const sqlParams = [isbnString];

    try {
      const queryResult = await pool.query(sqlQuery, sqlParams);
      if (queryResult.rowCount > 0) {
        const book = await formatRecord(queryResult.rows[0]);
        return res.json({ book });
      }
      res.status(404).json({ message: 'Book not found' });
    } catch (err) {
      console.error('Error fetching book by ISBN', err);
      res.status(500).json({ message: 'Server error – contact support' });
    }
  }
);

/**
 * @api {post} /books       Create a book
 * @apiName CreateBook
 * @apiGroup Books
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
  validateBookData,
  async (req: Request, res: Response) => {
    const { isbn, authors, publication_year, original_title, title, image_url, small_image_url } = req.body;
    // Generate a new ID since `id` has no default sequence
    const maxRes = await pool.query('SELECT MAX(book_id) as maxid FROM Book');
    const newId = (maxRes.rows[0].maxid || 0) + 1;
    const sqlQuery = `
      INSERT INTO Book (book_id, isbn, author, publication_year, title, description, genre, price, stock_quantity)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const sqlParams = [
      newId,
      isbn.toString(),
      authors,
      publication_year,
      title,
      original_title,
      'Unknown',
      9.99,
      100
    ];

    try {
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
 * @apiName UpdateBookRating
 * @apiGroup Books
 * 
 * @apiBody  {Number}  book_id     ID of the book to update rating for
 * @apiBody  {Number}  rating      New rating value (0-5)
 * 
 * @apiSuccess (200) {Object} rating        The updated rating record
 * 
 * @apiError   (400) {String} message       Invalid rating value
 * @apiError   (404) {String} message       Book not found
 * @apiError   (500) {String} message       Server error – contact support
 */
booksRouter.patch(
  '/rating',
  validateBookRating,
  async (req: Request, res: Response) => {
    console.log('Rating update endpoint hit with data:', req.body);
    try {
      const { book_id, rating } = req.body;

      // First check if the book exists
      const bookCheckQuery = 'SELECT book_id FROM Book WHERE book_id = $1';
      const bookCheckResult = await pool.query(bookCheckQuery, [book_id]);
      
      if (bookCheckResult.rowCount === 0) {
        return res.status(404).json({ message: 'Book not found' });
      }

      // Update or insert the rating
      const sqlQuery = `
        INSERT INTO Book_Rating (book_id, account_id, rating, review_text)
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
 * @apiName GetAllBooks
 * @apiGroup Books
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

      const countQuery = 'SELECT COUNT(*) FROM Book';
      const booksQuery = `
        SELECT 
          book_id,
          isbn,
          title,
          original_title,
          author,
          publication_year,
          icon_url_large,
          icon_url_small
        FROM Book
        ORDER BY title
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
 * @apiGroup Books
 *
 * @apiParam  {String} isbn    10–13 digit ISBN
 *
 * @apiSuccess {String} message  "Book deleted successfully"
 *
 * @apiError   (400) {String} message  "Invalid ISBN format."
 * @apiError   (404) {String} message  "Book not found"
 * @apiError   (500) {String} message  "Server error – contact support"
 */
booksRouter.delete(
  '/isbn/:isbn',
  validateIsbnFormat,
  async (req: Request, res: Response) => {
    const isbnString = req.params.isbn;

    try {
      // First check if the book exists
      const checkQuery = 'SELECT book_id FROM Book WHERE isbn = $1';
      const checkResult = await pool.query(checkQuery, [isbnString]);
      
      if (checkResult.rowCount === 0) {
        return res.status(404).json({ message: 'Book not found' });
      }

      const bookId = checkResult.rows[0].book_id;

      // Delete ratings first (due to foreign key constraint)
      const deleteRatingsQuery = 'DELETE FROM Book_Rating WHERE book_id = $1';
      await pool.query(deleteRatingsQuery, [bookId]);

      // Delete the book
      const deleteQuery = 'DELETE FROM Book WHERE isbn = $1';
      await pool.query(deleteQuery, [isbnString]);

      return res.status(200).json({ message: 'Book deleted successfully' });
    } catch (err) {
      console.error('Error deleting book by ISBN', err);
      res.status(500).json({ message: 'Server error – contact support' });
    }
  }
);

/**
 * @api {delete} /books/range       Delete books by ISBN range
 * @apiName DeleteByRange
 * @apiGroup Books
 *
 * @apiBody  {String}  start_isbn  Starting ISBN in range
 * @apiBody  {String}  end_isbn    Ending ISBN in range
 *
 * @apiSuccess {String} message        "Books deleted successfully"
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
      const getBooksQuery = 'SELECT book_id FROM Book WHERE isbn BETWEEN $1 AND $2';
      const booksResult = await pool.query(getBooksQuery, [start_isbn.toString(), end_isbn.toString()]);

      if (booksResult.rowCount === 0) {
        return res.status(404).json({ message: 'No books found in range' });
      }

      const bookIds = booksResult.rows.map(row => row.book_id);

      // Delete ratings first (due to foreign key constraint)
      const deleteRatingsQuery = 'DELETE FROM Book_Rating WHERE book_id = ANY($1)';
      await pool.query(deleteRatingsQuery, [bookIds]);

      // Delete books in range and return their ISBNs
      const deleteQuery = 'DELETE FROM Book WHERE book_id = ANY($1) RETURNING isbn';
      const result = await pool.query(deleteQuery, [bookIds]);

      return res.status(200).json({
        message: 'Books deleted successfully',
        deleted_count: result.rowCount,
        deleted_isbns: result.rows.map(row => row.isbn)
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
 * @apiGroup Books
 *
 * @apiParam  {String} title   URL-encoded book title
 *
 * @apiSuccess {Object[]} books     Matching book records
 * @apiSuccess {Number}   books.book_id
 * @apiSuccess {String}   books.isbn
 * @apiSuccess {Number}   books.publication_year
 * @apiSuccess {String}   books.title
 * @apiSuccess {String}   books.image_url
 * @apiSuccess {String}   books.small_image_url
 * @apiSuccess {String}   books.formatted
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
          book_id,
          isbn,
          title,
          original_title,
          author,
          publication_year,
          icon_url_large,
          icon_url_small
        FROM Book
        WHERE title ILIKE $1
        ORDER BY title
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
 * @apiGroup Books
 *
 * @apiParam  {Number} rating   Rating value (1-5)
 *
 * @apiSuccess {Object[]} books     Matching book records
 * @apiSuccess {Number}   books.book_id
 * @apiSuccess {String}   books.isbn
 * @apiSuccess {Number}   books.publication_year
 * @apiSuccess {String}   books.title
 * @apiSuccess {String}   books.image_url
 * @apiSuccess {String}   books.small_image_url
 * @apiSuccess {String}   books.formatted
 * @apiSuccess {Number}   books.average_rating
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
    if (isNaN(rating) || rating < 0 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be a number between 0 and 5' });
    }

    const query = `
        SELECT 
            b.book_id,
            b.isbn,
            b.title,
            b.original_title,
            b.author,
            b.publication_year,
            b.icon_url_large,
            b.icon_url_small,
            COALESCE(AVG(br.rating), 0) as avg_rating
        FROM Book b
        LEFT JOIN Book_Rating br ON b.book_id = br.book_id
        GROUP BY b.book_id, b.isbn, b.title, b.original_title, b.author, b.publication_year, b.icon_url_large, b.icon_url_small
        HAVING COALESCE(AVG(br.rating), 0) = $1
        ORDER BY b.title
    `;

    try {
        const result = await pool.query(query, [rating]);
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
 * @apiGroup Books
 *
 * @apiParam  {Number} year   Publication year
 *
 * @apiSuccess {Object[]} books     Matching book records
 * @apiSuccess {Number}   books.book_id
 * @apiSuccess {String}   books.isbn
 * @apiSuccess {Number}   books.publication_year
 * @apiSuccess {String}   books.original_title
 * @apiSuccess {String}   books.title
 * @apiSuccess {String}   books.image_url
 * @apiSuccess {String}   books.small_image_url
 * @apiSuccess {String}   books.formatted
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
            book_id,
            isbn,
            title,
            original_title,
            author,
            publication_year,
            icon_url_large,
            icon_url_small
        FROM Book
        WHERE publication_year = $1
        ORDER BY title
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