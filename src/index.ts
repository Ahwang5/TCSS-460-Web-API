import './core/force-ssl';

import express, { Express, Request, Response } from 'express';

import cors from 'cors';

import { routes } from './routes';

const app: Express = express();

// Use Heroku's PORT or fallback to 4001 for local development
const PORT = process.env.PORT || 4001;

app.use(cors());

/*
 * This middleware function parses JSON in the body of POST requests
 */
app.use(express.json());

app.use(routes);

// Debug: Print all registered routes
app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
        console.log("Route:", r.route.path)
    }
});

app.get('/', (request: Request, response: Response) => {
    response.send('<h1>Hello World!</h1><h2>Hello Heroku!</h2>');
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
    } else {
        console.error('Server error:', error);
    }
    process.exit(1);
});
