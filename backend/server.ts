import 'dotenv/config';
import { initDB } from './db/init';
import app from './app';

// Validate critical env vars before starting local server
if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL is not set in environment.');
}
if (!process.env.SESSION_SECRET) {
  console.warn('⚠️  SESSION_SECRET is not set in environment.');
}

// In local environment, spin up the HTTP listener
if (!process.env.VERCEL) {
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.listen(PORT, () => {
    console.log('─────────────────────────────────────────');
    console.log(`  🏠  Flatmate Expense Manager (Backend)`);
    console.log(`  →   http://localhost:${PORT}`);
    console.log('─────────────────────────────────────────\n');

    initDB()
      .then(() => {
        console.log('Database initialized successfully.\n');
      })
      .catch((err: any) => {
        console.error('Failed to initialise database:', err.message);
      });
  });
}

export default app;
