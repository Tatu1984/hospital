// Vercel Serverless Function Entry Point

// Try to load the full app
let loadError: string | null = null;

try {
  // Import the full Express app from server.ts
  const { app } = require('../src/server');
  module.exports = app;
} catch (error: any) {
  loadError = error.message || 'Unknown error loading server';
  console.error('Error loading full server:', error);

  // Create a minimal fallback app
  const express = require('express');
  const cors = require('cors');

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  // Health check
  app.get('/api/health', (req: any, res: any) => {
    res.json({
      status: 'error',
      message: 'Server failed to load',
      error: loadError,
      timestamp: new Date().toISOString(),
      env: {
        hasDatabase: !!process.env.DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
      }
    });
  });

  // Error for all other routes
  app.use('/api', (req: any, res: any) => {
    res.status(503).json({
      error: 'SERVER_LOAD_ERROR',
      message: loadError,
      hint: 'Check Vercel logs for more details.'
    });
  });

  module.exports = app;
}
