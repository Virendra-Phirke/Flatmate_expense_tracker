import app from './app';

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Invocation Crash]:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      const origin = req?.headers?.origin;
      const isAllowedOrigin = Boolean(
        origin && (
          origin === 'http://localhost:5173' ||
          origin === 'http://localhost:3000' ||
          (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL.replace(/\/$/, '')) ||
          /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)
        )
      );
      const safeOrigin = isAllowedOrigin ? origin : 'https://flatmate-expense-tracker-lemon.vercel.app';
      res.setHeader('Access-Control-Allow-Origin', safeOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.end(JSON.stringify({
        error: 'Backend Serverless Execution Error',
        message: process.env.NODE_ENV === 'production'
          ? 'Internal server execution error'
          : (err?.message || String(err)),
      }));
    }
  }
}
