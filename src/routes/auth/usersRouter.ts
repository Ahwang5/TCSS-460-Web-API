import express, { Router, Request, Response, NextFunction } from 'express';
import { pool, isStringProvided, credentialingFunctions } from '../../core/utilities';
import { AuthenticatedRequest } from '../../types';
import { authenticateToken } from '../../middleware/auth';
import crypto from 'crypto';

const usersRouter: Router = express.Router();
const { generateHash, generateSalt } = credentialingFunctions;

// Store reset tokens (in production, use a database table)
const resetTokens = new Map<string, { token: string; expires: number }>();

/**
 * @api {patch} /users/password Change user password
 * @apiName ChangePassword
 * @apiGroup Users
 * 
 * @apiBody {String} current_password Current password
 * @apiBody {String} new_password New password (must be at least 8 characters)
 * 
 * @apiSuccess {String} message Success message
 * 
 * @apiError (400) {String} message Invalid current password or new password format
 * @apiError (401) {String} message Unauthorized - invalid token
 * @apiError (500) {String} message Server error
 */
usersRouter.patch(
  '/password',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized - invalid token' });
      }

      // Validate password format
      if (!isStringProvided(new_password) || new_password.length < 8) {
        return res.status(400).json({ 
          message: 'New password must be at least 8 characters long' 
        });
      }

      // Get current credentials from database
      const getCredentialsQuery = 'SELECT salted_hash, salt FROM Account_Credential WHERE account_id = $1';
      const credentialsResult = await pool.query(getCredentialsQuery, [userId]);

      if (credentialsResult.rowCount === 0) {
        return res.status(401).json({ message: 'User credentials not found' });
      }

      // Verify current password
      const storedSalt = credentialsResult.rows[0].salt;
      const storedSaltedHash = credentialsResult.rows[0].salted_hash;
      const providedSaltedHash = generateHash(current_password, storedSalt);

      if (storedSaltedHash !== providedSaltedHash) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Generate new salted hash with the same salt
      const newSaltedHash = generateHash(new_password, storedSalt);

      // Update password in database
      const updatePasswordQuery = 'UPDATE Account_Credential SET salted_hash = $1 WHERE account_id = $2';
      await pool.query(updatePasswordQuery, [newSaltedHash, userId]);

      res.json({ message: 'Password updated successfully' });
    } catch (err) {
      console.error('Error changing password:', err);
      res.status(500).json({ message: 'Server error - contact support' });
    }
  }
);

/**
 * @api {post} /users/forgot-password Request password reset
 * @apiName ForgotPassword
 * @apiGroup Users
 * 
 * @apiBody {String} username Username to reset password for
 * 
 * @apiSuccess {String} message Success message with reset token
 * @apiSuccess {String} reset_token Temporary token to use for password reset
 * 
 * @apiError (400) {String} message Username not provided
 * @apiError (404) {String} message User not found
 */
usersRouter.post('/forgot-password', async (req: Request, res: Response) => {
    const { username } = req.body;

    if (!isStringProvided(username)) {
        return res.status(400).json({ message: 'Username is required' });
    }

    try {
        // Check if user exists
        const userResult = await pool.query(
            'SELECT account_id FROM Account WHERE username = $1',
            [username]
        );

        if (userResult.rowCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate reset token (valid for 1 hour)
        const token = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + 3600000; // 1 hour from now

        // Store token
        resetTokens.set(username, { token, expires });

        // In production, you would send this token via email
        return res.status(200).json({
            message: 'Password reset token generated',
            reset_token: token
        });
    } catch (error) {
        console.error('Error in forgot password:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @api {post} /users/reset-password Reset password using token
 * @apiName ResetPassword
 * @apiGroup Users
 * 
 * @apiBody {String} username Username
 * @apiBody {String} reset_token Reset token received from forgot-password
 * @apiBody {String} new_password New password (must be at least 8 characters)
 * 
 * @apiSuccess {String} message Success message
 * 
 * @apiError (400) {String} message Invalid input or expired token
 * @apiError (404) {String} message User not found
 */
usersRouter.post('/reset-password', async (req: Request, res: Response) => {
    const { username, reset_token, new_password } = req.body;

    if (!isStringProvided(username) || !isStringProvided(reset_token) || !isStringProvided(new_password)) {
        return res.status(400).json({ message: 'Username, reset token, and new password are required' });
    }

    if (new_password.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    try {
        // Check if user exists
        const userResult = await pool.query(
            'SELECT account_id FROM Account WHERE username = $1',
            [username]
        );

        if (userResult.rowCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify reset token
        const storedToken = resetTokens.get(username);
        if (!storedToken || storedToken.token !== reset_token) {
            return res.status(400).json({ message: 'Invalid reset token' });
        }

        if (Date.now() > storedToken.expires) {
            resetTokens.delete(username);
            return res.status(400).json({ message: 'Reset token has expired' });
        }

        // Generate new password hash
        const salt = generateSalt();
        const hash = generateHash(new_password, salt);

        // Update password
        await pool.query(
            'UPDATE Account_Credential SET salted_hash = $1, salt = $2 WHERE account_id = $3',
            [hash, salt, userResult.rows[0].account_id]
        );

        // Remove used token
        resetTokens.delete(username);

        return res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Error in reset password:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @api {delete} /users/:id Delete a user
 * @apiName DeleteUser
 * @apiGroup Users
 *
 * @apiParam {Number} id User ID to delete
 *
 * @apiSuccess {String} message Success message
 *
 * @apiError (404) {String} message User not found
 * @apiError (500) {String} message Server error
 */
usersRouter.delete(
    '/:id',
    authenticateToken, // Optional: require authentication
    async (req: Request, res: Response) => {
        try {
            const userId = req.params.id;

            // Check if user exists
            const checkUserQuery = 'SELECT account_id FROM Account WHERE account_id = $1';
            const checkResult = await pool.query(checkUserQuery, [userId]);

            if (checkResult.rowCount === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Delete associated credentials first (due to foreign key constraints)
            await pool.query('DELETE FROM Account_Credential WHERE account_id = $1', [userId]);

            // Delete the user
            const deleteQuery = 'DELETE FROM Account WHERE account_id = $1';
            await pool.query(deleteQuery, [userId]);

            return res.status(200).json({ message: 'User deleted successfully' });
        } catch (err) {
            console.error('Error deleting user:', err);
            return res.status(500).json({ message: 'Server error' });
        }
    }
);

export { usersRouter }; 