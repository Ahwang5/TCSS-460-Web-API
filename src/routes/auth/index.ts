import express, { Router } from 'express';

import { signinRouter } from './login';
import { registerRouter } from './register';
import { usersRouter } from './usersRouter';

const authRoutes: Router = express.Router();

authRoutes.use(signinRouter, registerRouter);
authRoutes.use('/users', usersRouter);

export { authRoutes };
