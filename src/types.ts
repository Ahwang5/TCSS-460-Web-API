import { Request } from 'express';

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
} 