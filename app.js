import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

const app = express();

app.set('trust proxy', 1); // Render terminates TLS in front of the app; needed for correct client IPs / rate limiting
app.disable('x-powered-by');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin(origin, cb) {
      // No Origin header = curl / server-to-server / health checks. Browsers always send one.
      if (!origin || env.frontendUrls.includes(origin.replace(/\/$/, ''))) return cb(null, true);
      return cb(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86400,
  }),
);
if (!env.isProd || process.env.LOG_REQUESTS === 'true') app.use(morgan(env.isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => res.json({ name: 'Forex Trading Journal API', health: '/api/health' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', apiLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
