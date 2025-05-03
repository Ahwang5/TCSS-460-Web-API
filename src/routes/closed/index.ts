import express, { Router } from 'express';

import { checkToken } from '../../core/middleware';
import { tokenTestRouter } from './tokenTest';
import { closedMessageRouter } from './closed_message';

const closedRoutes: Router = express.Router();

closedRoutes.use('/jwt_test', checkToken, tokenTestRouter);

closedRoutes.use('/message', closedMessageRouter);

export { closedRoutes };
