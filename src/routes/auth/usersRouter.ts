import express, { Request, Response, Router } from 'express';
import { pool, validationFunctions, credentialingFunctions } from '../../core/utilities';
import { AuthenticatedRequest } from '../../../src/types';
import { authenticateToken } from '../../middleware/auth';

const usersRouter: Router = express.Router();
const { isStringProvided } = validationFunctions;
const { generateHash } = credentialingFunctions;

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

export { usersRouter }; 