// express is the framework we're going to use to handle requests
import express, { Request, Response, Router, NextFunction } from 'express';

import jwt from 'jsonwebtoken';

// Check for JWT secret
if (!process.env.JSON_WEB_TOKEN) {
    console.error('JSON_WEB_TOKEN environment variable is not set!');
    process.exit(1);
}

const key = {
    secret: process.env.JSON_WEB_TOKEN,
};

import {
    pool,
    isStringProvided,
    isNumberProvided,
    credentialingFunctions,
} from '../../core/utilities';

const generateHash = credentialingFunctions.generateHash;
const generateSalt = credentialingFunctions.generateSalt;

const registerRouter: Router = express.Router();

export interface IUserRequest extends Request {
    id: number;
}

// Add more/your own password validation here. The *rules* must be documented
// and the client-side validation should match these rules.
const isValidPassword = (password: string): boolean =>
    isStringProvided(password) && password.length > 7;

// Add more/your own phone number validation here. The *rules* must be documented
// and the client-side validation should match these rules.
const isValidPhone = (phone: string): boolean =>
    isStringProvided(phone) && phone.length >= 10;

// Add more/your own role validation here. The *rules* must be documented
// and the client-side validation should match these rules.
const isValidRole = (priority: string): boolean =>
    isNumberProvided(priority) &&
    parseInt(priority) >= 1 &&
    parseInt(priority) <= 5;

// Add more/your own email validation here. The *rules* must be documented
// and the client-side validation should match these rules.
const isValidEmail = (email: string): boolean =>
    isStringProvided(email) && email.includes('@');

// middleware functions may be defined elsewhere!
const emailMiddlewareCheck = (
    request: Request,
    response: Response,
    next: NextFunction
) => {
    if (isValidEmail(request.body.email)) {
        next();
    } else {
        response.status(400).send({
            message: 'Invalid or missing email - please refer to documentation',
        });
    }
};

// Add error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

/**
 * @api {post} /register Request to register a user
 *
 * @apiDescription Document this route. !**Document the password rules here**!
 * !**Document the role rules here**!
 *
 * @apiName PostRegister
 * @apiGroup Auth
 *
 * @apiBody {String} firstname a users first name
 * @apiBody {String} lastname a users last name
 * @apiBody {String} email a users email *unique
 * @apiBody {String} password a users password
 * @apiBody {String} username a username *unique
 * @apiBody {String} role a role for this user [1-5]
 * @apiBody {String} phone a phone number for this user
 *
 * @apiSuccess {String} accessToken JSON Web Token
 * @apiSuccess {Object} user a user object
 * @apiSuccess {string} user.name the first name associated with <code>email</code>
 * @apiSuccess {string} user.email The email associated with <code>email</code>
 * @apiSuccess {string} user.role The role associated with <code>email</code>
 * @apiSuccess {number} user.id The internal user id associated with <code>email</code>
 *
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * @apiError (400: Invalid Password) {String} message "Invalid or missing password  - please refer to documentation"
 * @apiError (400: Invalid Phone) {String} message "Invalid or missing phone number  - please refer to documentation"
 * @apiError (400: Invalid Email) {String} message "Invalid or missing email  - please refer to documentation"
 * @apiError (400: Invalid Role) {String} message "Invalid or missing role  - please refer to documentation"
 * @apiError (400: Username exists) {String} message "Username exists"
 * @apiError (400: Email exists) {String} message "Email exists"
 *
 */
registerRouter.post(
    '/register',
    emailMiddlewareCheck, // these middleware functions may be defined elsewhere!
    (request: Request, response: Response, next: NextFunction) => {
        //Verify that the caller supplied all the parameters
        //In js, empty strings or null values evaluate to false
        if (
            isStringProvided(request.body.firstname) &&
            isStringProvided(request.body.lastname) &&
            isStringProvided(request.body.username)
        ) {
            next();
        } else {
            response.status(400).send({
                message: 'Missing required information',
            });
        }
    },
    (request: Request, response: Response, next: NextFunction) => {
        if (isValidPhone(request.body.phone)) {
            next();
        } else {
            response.status(400).send({
                message:
                    'Invalid or missing phone number  - please refer to documentation',
            });
        }
    },
    (request: Request, response: Response, next: NextFunction) => {
        if (isValidPassword(request.body.password)) {
            next();
        } else {
            response.status(400).send({
                message:
                    'Invalid or missing password  - please refer to documentation',
            });
        }
    },
    (request: Request, response: Response, next: NextFunction) => {
        if (isValidRole(request.body.role)) {
            next();
        } else {
            response.status(400).send({
                message:
                    'Invalid or missing role  - please refer to documentation',
            });
        }
    },
    (request: IUserRequest, response: Response, next: NextFunction) => {
        const theQuery =
            'INSERT INTO Account(firstname, lastname, username, email, phone, account_role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING account_id';
        const values = [
            request.body.firstname,
            request.body.lastname,
            request.body.username,
            request.body.email,
            request.body.phone,
            request.body.role,
        ];
        // console.dir({ ...request.body, password: '******' });
        pool.query(theQuery, values)
            .then((result) => {
                //stash the account_id into the request object to be used in the next function
                // NOTE the TYPE for the Request object in this middleware function
                request.id = result.rows[0].account_id;
                next();
            })
            .catch((error) => {
                //log the error
                // console.log(error)
                console.error('DB Query error on register:', error);
                if (error.constraint == 'account_username_key') {
                    response.status(400).send({
                        message: 'Username exists',
                    });
                } else if (error.constraint == 'account_email_key') {
                    response.status(400).send({
                        message: 'Email exists',
                    });
                } else if (error.constraint == 'account_phone_key') {
                    response.status(400).send({
                        message: 'Duplicate phone number not allowed',
                    });
                } else {
                    //log the error
                    response.status(500).send({
                        message: 'server error - contact support, bill',
                    });
                }
            });
    },
    async (request: IUserRequest, response: Response) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const salt = generateSalt(32);
            const saltedHash = generateHash(request.body.password, salt);

            const theQuery =
                'INSERT INTO Account_Credential(account_id, salted_hash, salt) VALUES ($1, $2, $3)';
            const values = [request.id, saltedHash, salt];
            
            console.log('Attempting to insert credentials with values:', {
                account_id: request.id,
                salt_length: salt.length,
                hash_length: saltedHash.length
            });
            
            await client.query(theQuery, values);
            
            const accessToken = jwt.sign(
                {
                    role: request.body.role,
                    id: request.id,
                },
                key.secret,
                {
                    expiresIn: '14 days',
                }
            );

            await client.query('COMMIT');

            response.status(201).send({
                accessToken,
                user: {
                    id: request.id,
                    name: request.body.firstname,
                    email: request.body.email,
                    role: request.body.role,
                },
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Detailed error in register route:', {
                error: error,
                message: error.message,
                stack: error.stack,
                code: error.code,
                detail: error.detail
            });
            response.status(500).send({
                message: 'server error - contact support, bhav',
            });
        } finally {
            client.release();
        }
    }
);

registerRouter.get('/hash_demo', (request, response) => {
    const password = 'password12345';

    const salt = generateSalt(32);
    const saltedHash = generateHash(password, salt);
    const unsaltedHash = generateHash(password, '');

    response.status(200).send({
        salt: salt,
        salted_hash: saltedHash,
        unsalted_hash: unsaltedHash,
    });
});

export { registerRouter };
