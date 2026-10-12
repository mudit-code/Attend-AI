import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import authRouter from './modules/auth/routes';
import academicRouter from './modules/academic/routes';
import usersRouter from './modules/users/routes';
import attendanceRouter from './modules/attendance/routes';
import syncRouter from './modules/sync/routes';
import qrRouter from './modules/qr/routes';
import leaveRouter from './modules/leave/routes';
import correctionRouter from './modules/correction/routes';
import reportsRouter from './modules/reports/routes';
import adminRouter from './modules/admin/routes';

const app = express();

// ─── Security Headers ─────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  })
);

// ─── CORS ─────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true, // Required for cookies
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

// ─── Body Parsers ─────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Global Rate Limit ────────────────────────────────────────────
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
  })
);

// ─── Health Check ─────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: env.APP_VERSION,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/academic', academicRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/sync', syncRouter);
app.use('/api/v1/qr', qrRouter);
app.use('/api/v1/leaves', leaveRouter);
app.use('/api/v1/correction-requests', correctionRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/admin', adminRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// ─── Error Handler (must be last) ─────────────────────────────────
app.use(errorHandler);

export default app;
