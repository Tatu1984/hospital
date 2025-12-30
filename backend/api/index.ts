// Vercel Serverless Function Entry Point
// Minimal version to debug deployment issues

import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();

// CORS - allow all origins
app.use(cors({ origin: true, credentials: true }));

// Parse JSON
app.use(express.json());

// Health check that always works
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
    env: {
      hasDatabase: !!process.env.DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV || 'not set'
    }
  });
});

// Test endpoint
app.get('/api/test', (req: Request, res: Response) => {
  res.json({ message: 'API is working!' });
});

// Try to load the full app, but catch errors
let fullApp: any = null;
let loadError: string | null = null;

try {
  const { app: serverApp } = require('../src/server');
  fullApp = serverApp;
} catch (error: any) {
  loadError = error.message || 'Unknown error loading server';
  console.error('Error loading full server:', error);
}

// If full app loaded, use it for other routes
if (fullApp) {
  app.use(fullApp);
} else {
  // Show error for all other routes
  app.use('/api', (req: Request, res: Response) => {
    res.status(503).json({
      error: 'SERVER_LOAD_ERROR',
      message: loadError,
      hint: 'Check Vercel logs for more details. Make sure DATABASE_URL and JWT_SECRET are set in Environment Variables.'
    });
  });
}

export default app;
