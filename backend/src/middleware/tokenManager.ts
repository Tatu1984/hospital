import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { logger, auditLogger } from '../utils/logger';
import { AuthenticatedRequest } from './auth';

// Token types
interface AccessTokenPayload {
  userId: string;
  username: string;
  tenantId: string;
  branchId: string;
  roleIds: string[];
  type: 'access';
  sessionId: string;
}

interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  type: 'refresh';
}

// In-memory store for refresh tokens (in production, use Redis)
interface StoredRefreshToken {
  token: string;
  userId: string;
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
  isRevoked: boolean;
}

const refreshTokenStore = new Map<string, StoredRefreshToken>();

// Token blacklist for revoked access tokens
const tokenBlacklist = new Set<string>();

// Configuration
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access tokens for security
const REFRESH_TOKEN_EXPIRY = '7d'; // Longer-lived refresh tokens
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Generate access token
 */
export function generateAccessToken(
  userId: string,
  username: string,
  tenantId: string,
  branchId: string,
  roleIds: string[],
  sessionId: string
): string {
  const payload: AccessTokenPayload = {
    userId,
    username,
    tenantId,
    branchId,
    roleIds,
    type: 'access',
    sessionId,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(
  userId: string,
  sessionId: string,
  req?: Request
): string {
  const payload: RefreshTokenPayload = {
    userId,
    sessionId,
    type: 'refresh',
  };

  const token = jwt.sign(payload, config.jwt.secret, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  // Store refresh token
  refreshTokenStore.set(sessionId, {
    token,
    userId,
    sessionId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    userAgent: req?.headers['user-agent'],
    ip: req?.ip,
    isRevoked: false,
  });

  return token;
}

/**
 * Generate both tokens for login
 */
export function generateTokenPair(
  userId: string,
  username: string,
  tenantId: string,
  branchId: string,
  roleIds: string[],
  req?: Request
): { accessToken: string; refreshToken: string; sessionId: string; expiresIn: number } {
  const sessionId = generateSessionId();

  const accessToken = generateAccessToken(userId, username, tenantId, branchId, roleIds, sessionId);
  const refreshToken = generateRefreshToken(userId, sessionId, req);

  // Access token expires in 15 minutes (900 seconds)
  return {
    accessToken,
    refreshToken,
    sessionId,
    expiresIn: 900,
  };
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return null;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as AccessTokenPayload;

    if (decoded.type !== 'access') {
      return null;
    }

    // Verify session is still valid
    const session = refreshTokenStore.get(decoded.sessionId);
    if (!session || session.isRevoked) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verify refresh token and issue new token pair
 */
export function refreshTokens(
  refreshToken: string,
  username: string,
  tenantId: string,
  branchId: string,
  roleIds: string[],
  req?: Request
): { accessToken: string; refreshToken: string; expiresIn: number } | null {
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.secret) as RefreshTokenPayload;

    if (decoded.type !== 'refresh') {
      return null;
    }

    // Verify stored refresh token
    const storedToken = refreshTokenStore.get(decoded.sessionId);

    if (!storedToken || storedToken.isRevoked) {
      auditLogger.securityEvent('REFRESH_TOKEN_REUSE', {
        userId: decoded.userId,
        sessionId: decoded.sessionId,
        ip: req?.ip,
      });
      return null;
    }

    if (storedToken.token !== refreshToken) {
      // Token mismatch - potential token theft, revoke all sessions
      revokeAllUserSessions(decoded.userId);
      auditLogger.securityEvent('REFRESH_TOKEN_MISMATCH', {
        userId: decoded.userId,
        sessionId: decoded.sessionId,
        ip: req?.ip,
      });
      return null;
    }

    // Generate new tokens with same session ID
    const newAccessToken = generateAccessToken(
      decoded.userId,
      username,
      tenantId,
      branchId,
      roleIds,
      decoded.sessionId
    );

    // Rotate refresh token
    const newRefreshToken = generateRefreshToken(decoded.userId, decoded.sessionId, req);

    // Mark old refresh token as used (for detecting reuse)
    storedToken.isRevoked = true;

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    };
  } catch {
    return null;
  }
}

/**
 * Revoke a specific session
 */
export function revokeSession(sessionId: string, accessToken?: string): void {
  const session = refreshTokenStore.get(sessionId);
  if (session) {
    session.isRevoked = true;

    auditLogger.securityEvent('SESSION_REVOKED', {
      userId: session.userId,
      sessionId,
    });
  }

  // Blacklist the access token if provided
  if (accessToken) {
    tokenBlacklist.add(accessToken);
  }
}

/**
 * Revoke all sessions for a user
 */
export function revokeAllUserSessions(userId: string): void {
  for (const [sessionId, session] of refreshTokenStore.entries()) {
    if (session.userId === userId) {
      session.isRevoked = true;
    }
  }

  auditLogger.securityEvent('ALL_SESSIONS_REVOKED', {
    userId,
  });
}

/**
 * Get all active sessions for a user
 */
export function getUserSessions(userId: string): Array<{
  sessionId: string;
  createdAt: Date;
  lastUsed: Date;
  userAgent?: string;
  ip?: string;
}> {
  const sessions: Array<{
    sessionId: string;
    createdAt: Date;
    lastUsed: Date;
    userAgent?: string;
    ip?: string;
  }> = [];

  for (const [sessionId, session] of refreshTokenStore.entries()) {
    if (session.userId === userId && !session.isRevoked && session.expiresAt > new Date()) {
      sessions.push({
        sessionId,
        createdAt: session.createdAt,
        lastUsed: session.createdAt, // In production, track last activity
        userAgent: session.userAgent,
        ip: session.ip,
      });
    }
  }

  return sessions;
}

/**
 * Cleanup expired tokens
 */
export function cleanupExpiredTokens(): void {
  const now = new Date();
  let cleaned = 0;

  for (const [sessionId, session] of refreshTokenStore.entries()) {
    if (session.expiresAt < now || session.isRevoked) {
      refreshTokenStore.delete(sessionId);
      cleaned++;
    }
  }

  // Cleanup old blacklisted tokens (older than 1 hour - they would have expired anyway)
  // In production, use Redis with TTL
  if (tokenBlacklist.size > 10000) {
    tokenBlacklist.clear();
  }

  if (cleaned > 0) {
    logger.info('Token cleanup completed', { cleanedSessions: cleaned });
  }
}

// Run cleanup every 15 minutes
setInterval(cleanupExpiredTokens, 15 * 60 * 1000);

/**
 * Middleware for token refresh endpoint
 */
export const handleTokenRefresh = async (
  req: Request,
  res: Response
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Refresh token is required',
      });
    }

    // Decode token to get session info
    const decoded = jwt.decode(refreshToken) as RefreshTokenPayload;
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid refresh token',
      });
    }

    // Get user data from database (you would fetch this)
    // For now, we require the client to send user context
    const { username, tenantId, branchId, roleIds } = req.body;

    const tokens = refreshTokens(refreshToken, username, tenantId, branchId, roleIds, req);

    if (!tokens) {
      return res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'Refresh token is invalid or expired. Please log in again.',
      });
    }

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });
  } catch (error) {
    logger.error('Token refresh error', { error });
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An error occurred while refreshing your session',
    });
  }
};

/**
 * Middleware for logout
 */
export const handleLogout = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader?.split(' ')[1];

    if (req.user) {
      // Revoke current session
      const decoded = accessToken ? jwt.decode(accessToken) as AccessTokenPayload : null;
      if (decoded?.sessionId) {
        revokeSession(decoded.sessionId, accessToken);
      }

      auditLogger.securityEvent('LOGOUT', {
        userId: req.user.userId,
        ip: req.ip,
      });
    }

    res.json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error', { error });
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An error occurred during logout',
    });
  }
};

/**
 * Middleware for logging out all sessions
 */
export const handleLogoutAll = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (req.user) {
      revokeAllUserSessions(req.user.userId);

      auditLogger.securityEvent('LOGOUT_ALL', {
        userId: req.user.userId,
        ip: req.ip,
      });
    }

    res.json({
      message: 'All sessions logged out successfully',
    });
  } catch (error) {
    logger.error('Logout all error', { error });
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An error occurred during logout',
    });
  }
};

/**
 * Get user's active sessions
 */
export const handleGetSessions = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const sessions = getUserSessions(req.user.userId);

    res.json({
      sessions: sessions.map(s => ({
        ...s,
        ip: s.ip ? s.ip.replace(/\d+$/, 'xxx') : undefined, // Partially mask IP
      })),
    });
  } catch (error) {
    logger.error('Get sessions error', { error });
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An error occurred while fetching sessions',
    });
  }
};

// Fix: Define the missing 'token' variable in refreshTokens function
// The function had a bug - it was using 'token' instead of 'refreshToken'
