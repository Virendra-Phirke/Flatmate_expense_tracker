import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { authContextMiddleware } from './middleware/auth';

// ── Route modules ─────────────────────────────────────────────────────────────
import authRouter from './routes/auth';
import membersRouter from './routes/members';
import categoriesRouter from './routes/categories';
import expensesRouter from './routes/expenses';
import purchasesRouter from './routes/purchases';
import balancesRouter from './routes/balances';
import settlementsRouter from './routes/settlements';
import profileRouter from './routes/profile';
import activityRouter from './routes/activity';
import aiRouter from './routes/ai';
import analyticsRouter from './routes/analytics';

export const app = express();

// ── CORS Configuration for Separate Frontend Deployments ───────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://flatmate-expense-tracker-lemon.vercel.app',
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    // Allow localhost or valid Vercel subdomains or configured FRONTEND_URL
    const isVercelSubdomain = /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin);
    if (allowedOrigins.includes(origin) || isVercelSubdomain) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('Origin blocked by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie', 'Authorization'],
  maxAge: 86400,
};

app.use(cors(corsOptions));

// ── Reverse Proxy Trust (AUD-09) ──────────────────────────────────────────────
app.set('trust proxy', 1);

// ── HTTPS Enforcement & Security Headers ──────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  // Enforce HTTPS redirect in production if forwarded through reverse proxy as HTTP
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (
    process.env.NODE_ENV === 'production' &&
    forwardedProto &&
    forwardedProto !== 'https'
  ) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Enforce HSTS (Strict-Transport-Security) for 1 year with subdomains in production or HTTPS
  if (process.env.NODE_ENV === 'production' || req.secure || forwardedProto === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
});

// ── Body parsing & Cookies ───────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

// ── Stateless JWT Authentication & Session Compatibility ──────────────────────
app.use(authContextMiddleware);

// ── Health / Diagnostics Endpoint ─────────────────────────────────────────────
app.get(['/', '/api/health', '/health', '/api', '/api/'], (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    name: 'Flatmate Expense Manager API',
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasSessionSecret: Boolean(process.env.SESSION_SECRET || process.env.JWT_SECRET),
    nodeEnv: process.env.NODE_ENV || 'not_set',
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/members', membersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/balances', balancesRouter);
app.use('/api/settlements', settlementsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/upi', profileRouter); // AUD-04 route alias for UPI QR generation
app.use('/api/activity', activityRouter);
app.use('/api/ai', aiRouter);
app.use('/api/analytics', analyticsRouter);

// ── Root route aliases (resilience against proxies or serverless rewriting that strips /api) ──
app.use('/auth', authRouter);
app.use('/members', membersRouter);
app.use('/categories', categoriesRouter);
app.use('/expenses', expensesRouter);
app.use('/purchases', purchasesRouter);
app.use('/balances', balancesRouter);
app.use('/settlements', settlementsRouter);
app.use('/profile', profileRouter);
app.use('/upi', profileRouter);
app.use('/activity', activityRouter);
app.use('/ai', aiRouter);
app.use('/analytics', analyticsRouter);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled error]', err);
  const status = typeof err.status === 'number' ? err.status : (typeof err.statusCode === 'number' ? err.statusCode : 500);
  res.status(status).json({ error: err.expose ? err.message : 'Internal server error' });
});

export default app;
