import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import crypto from 'crypto';

// Create and export the database pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Validation helper functions
export const isStringProvided = (value: any): boolean => {
  return value && typeof value === 'string' && value.trim().length > 0;
};

export const isNumberProvided = (value: any): boolean => {
  return value !== undefined && value !== null && !isNaN(Number(value));
};

// Credentialing functions
export const credentialingFunctions = {
  generateHash: (input: string, salt: string): string => {
    const hash = crypto.createHash('md5');
    hash.update(input + salt);
    return hash.digest('hex');
  },
  
  generateSalt: (length: number = 16): string => {
    return crypto.randomBytes(length).toString('hex');
  },
  
  validatePassword: (password: string): boolean => {
    return password && password.length >= 6;
  }
};

// Validation middleware functions
export const validationMiddleware = {
  validateRatingParam: (req: Request, res: Response, next: NextFunction) => {
    const rating = parseFloat(req.params.rating);
    if (isNaN(rating) || rating < 0 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be a number between 0 and 5' });
    }
    next();
  },

  validateYear: (req: Request, res: Response, next: NextFunction) => {
    const year = parseInt(req.params.year);
    if (isNaN(year) || year < 0) {
      return res.status(400).json({ error: 'Year must be a positive number' });
    }
    next();
  }
}; 