import express, { Router } from 'express';

import { messageRouter } from './message';
import { booksRouter } from './booksRouter';

const openRoutes: Router = express.Router();

openRoutes.use('/message', messageRouter);
openRoutes.use('/books', booksRouter);

export { openRoutes };
