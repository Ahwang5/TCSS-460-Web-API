import { Request, Response, NextFunction } from 'express';

/**
 * Checks the parameter to see if it is a a String.
 *
 * @param {any} candidate the value to check
 * @returns true if the parameter is a String0, false otherwise
 */
function isString(candidate: any): candidate is string {
    return typeof candidate === 'string';
}

/**
 * Checks the parameter to see if it is a a String with a length greater than 0.
 *
 * @param {any} candidate the value to check
 * @returns true if the parameter is a String with a length greater than 0, false otherwise
 */
export function isStringProvided(candidate: any): boolean {
    return isString(candidate) && candidate.length > 0;
}

/**
 * Checks the parameter to see if it can be converted into a number.
 *
 * @param {any} candidate the value to check
 * @returns true if the parameter is a number, false otherwise
 */
export function isNumberProvided(candidate: any): boolean {
    return (
        isNumber(candidate) ||
        (candidate != null &&
            candidate != '' &&
            !isNaN(Number(candidate.toString())))
    );
}

/**
 * Helper
 * @param x data value to check the type of
 * @returns true if the type of x is a number, false otherise
 */
function isNumber(x: any): x is number {
    return typeof x === 'number';
}

// Feel free to add your own validations functions!
// for example: isNumericProvided, isValidPassword, isValidEmail, etc
// don't forget to export any

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
