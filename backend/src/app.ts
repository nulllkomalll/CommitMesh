import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { router } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.corsOrigins, methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', router);
app.use(notFoundHandler);
app.use(errorHandler);
