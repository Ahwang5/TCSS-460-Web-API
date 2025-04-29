import express, { NextFunction, Request, Response, Router } from 'express';
import { pool, validationFunctions } from '../../core/utilities';

const booksRouter: Router = express.Router();
const { isStringProvided, isNumberProvided } = validationFunctions;

/**
 * Formats a book record for output
 */
const formatRecord = (row: any) => ({
  ...row,
  formatted: `{${row.isbn13}} – ${row.title}`,
});

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
  const { isbn13, authors, publication_year, original_title, title, image_url, small_image_url } = req.body;
  if (
    !isNumberProvided(isbn13) ||
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
    const rawAuthor = req.params.author;
    const authorName = decodeURIComponent(rawAuthor);
    const sqlQuery = `
      SELECT *
        FROM books
       WHERE authors ILIKE '%' || $1 || '%'
    `;
    const sqlParams = [authorName];

    try {
      const queryResult = await pool.query(sqlQuery, sqlParams);
      if (queryResult.rowCount > 0) {
        return res.json({
          books: queryResult.rows.map(formatRecord),
        });
      }
      res.status(404).json({ message: 'Author not found' });
    } catch (err) {
      console.error('Error fetching books by author', err);
      res.status(500).json({ message: 'Server error – contact support' });
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
    const isbnNumeric = BigInt(isbnString);

    const sqlQuery = `
      SELECT *
        FROM books
       WHERE isbn13 = $1
    `;
    const sqlParams = [isbnNumeric];

    try {
      const queryResult = await pool.query(sqlQuery, sqlParams);
      if (queryResult.rowCount > 0) {
        return res.json({ book: queryResult.rows[0] });
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
 * @apiBody  {BigInt}  isbn13            10–13 digit ISBN
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
    const { isbn13, authors, publication_year, original_title, title, image_url, small_image_url } = req.body;
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
      BigInt(isbn13),
      authors,
      publication_year,
      original_title,
      title,
      image_url,
      small_image_url,
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
 * @api {post} /books/rating       Create a book rating
 * @apiName CreateBookRating
 * @apiGroup Books
 * 
 */
booksRouter.post(
  '/rating',
  validateBookRating,
  async (req: Request, res: Response) => {
    console.log('Rating endpoint hit with data:', req.body);  // Debug log
    try {
      const { book_id, rating } = req.body;
      
      const sqlQuery = `
        INSERT INTO book_ratings (book_id, rating)
        VALUES ($1, $2)
        RETURNING *;
      `;
      const sqlParams = [book_id, rating];

      console.log('Executing query:', sqlQuery, sqlParams);  // Debug log
      const queryResult = await pool.query(sqlQuery, sqlParams);
      console.log('Query result:', queryResult.rows[0]);  // Debug log
      return res.status(201).json({ rating: queryResult.rows[0] });
    } catch (err) {
      console.error('Error creating book rating', err);
      res.status(500).json({ message: 'Server error – contact support' });
    }
  }
);
export { booksRouter }; 