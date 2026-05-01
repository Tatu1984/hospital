// Vercel serverless entry point.
// Vercel auto-discovers `api/*.ts` files and turns each into a serverless
// function. We re-export the Express app from `src/server.ts` so every
// request rewritten here flows through the full middleware + route stack.
import app from '../src/server';

export default app;
