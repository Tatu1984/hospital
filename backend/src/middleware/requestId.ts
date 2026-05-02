import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Per-request correlation ID. Reads X-Request-ID from the incoming request if
 * the upstream proxy already set one, otherwise mints a new UUID. Echoes it
 * back on the response so clients can quote it when reporting issues, and
 * stashes it on `req.requestId` so downstream handlers / logger / Sentry can
 * pick it up without re-deriving.
 *
 * Without this, a single error in production produces logs in Winston, an
 * audit row, and a Sentry event with no shared key — correlating them means
 * eyeballing timestamps. With it, every entry carries the same id.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

const HEADER = 'x-request-id';
// Trust an inbound id only if it looks plausible — refuse anything obviously
// untrusted (>128 chars, weird characters) so a malicious client can't poison
// our log indices.
const SAFE_ID = /^[A-Za-z0-9_-]{8,128}$/;

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(HEADER);
  const id = incoming && SAFE_ID.test(incoming) ? incoming : crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}
