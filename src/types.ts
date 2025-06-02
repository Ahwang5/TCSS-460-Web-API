import { Request } from 'express';

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface IRatings {
  average: number;
  count: number;
  rating_1: number;
  rating_2: number;
  rating_3: number;
  rating_4: number;
  rating_5: number;
}

export interface IUrlIcon {
  large: string;
  small: string;
}

export interface IBook {
  id: number;
  isbn13: number;
  authors: string;
  publication: number;
  original_title: string;
  title: string;
  ratings: IRatings;
  icons: IUrlIcon;
}

export interface IMessage {
  id: number;
  message: string;
  priority: number;
  created_at: Date;
} 