import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger, auditLogger } from '../utils/logger';
import { hasAnyPermission, Permission, Role } from '../rbac';

// Extended request interface with user data
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    tenantId: string;
    branchId: string;
    roleIds: string[];
  };
}

// JWT token payload interface
interface TokenPayload {
  userId: string;
  username: string;
  tenantId: string;
  branchId: string;
  roleIds: string[];
  iat: number;
  exp: number;
}

// Authentication middleware
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'No access token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;

    // Check if token is expired
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.',
      });
    }

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      tenantId: decoded.tenantId,
      branchId: decoded.branchId,
      roleIds: decoded.roleIds,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.',
      });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      auditLogger.securityEvent('INVALID_TOKEN', {
        ip: req.ip,
        path: req.path,
        error: error.message,
      });
      return res.status(403).json({
        error: 'Invalid token',
        message: 'Your access token is invalid.',
      });
    }

    logger.error('Token verification error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred while verifying your credentials.',
    });
  }
};

// Permission-based authorization middleware
export const requirePermission = (...permissions: Permission[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.',
      });
    }

    const userRoles = req.user.roleIds || [];

    if (!hasAnyPermission(userRoles, permissions)) {
      auditLogger.securityEvent('ACCESS_DENIED', {
        userId: req.user.userId,
        path: req.path,
        method: req.method,
        requiredPermissions: permissions,
        userRoles,
      });

      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to perform this action.',
      });
    }

    next();
  };
};

// Role-based authorization middleware
export const requireRole = (...roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.',
      });
    }

    const userRoles = req.user.roleIds || [];
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      auditLogger.securityEvent('ACCESS_DENIED', {
        userId: req.user.userId,
        path: req.path,
        method: req.method,
        requiredRoles: roles,
        userRoles,
      });

      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have the required role to access this resource.',
      });
    }

    next();
  };
};

// Tenant isolation middleware - ensures users can only access their own tenant's data
export const enforceTenantIsolation = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.tenantId) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Tenant context is required.',
    });
  }

  // Store tenant context for use in queries
  res.locals.tenantId = req.user.tenantId;
  res.locals.branchId = req.user.branchId;

  next();
};

// Optional authentication - sets user if token present, but doesn't require it
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      tenantId: decoded.tenantId,
      branchId: decoded.branchId,
      roleIds: decoded.roleIds,
    };
  } catch {
    // Token invalid, but that's okay for optional auth
  }

  next();
};
