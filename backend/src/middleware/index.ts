// Export all middleware modules
export * from './auth';
export * from './errorHandler';
export * from './security';
export * from './hipaa';
export * from './tokenManager';
export * from './csrf';
export * from './validation';
export * from './rateLimit';
export * from './rbacMiddleware';

// Re-export commonly used items
export {
  authenticateToken,
  requirePermission,
  requireRole,
  enforceTenantIsolation,
  optionalAuth,
  AuthenticatedRequest,
} from './auth';

export {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from './errorHandler';

export {
  securityHeaders,
  generalRateLimiter,
  authRateLimiter,
  compressionMiddleware,
  sanitizeRequest,
  requestSizeLimiter,
  apiSecurityHeaders,
} from './security';

export {
  phiAccessLogger,
  phiModificationLogger,
  sessionTimeoutChecker,
  hipaaHeaders,
  verifyConsent,
  encryptPHI,
  decryptPHI,
  logEmergencyAccess,
  maskPHI,
  invalidateUserSessions,
} from './hipaa';

export {
  generateTokenPair,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  refreshTokens,
  revokeSession,
  revokeAllUserSessions,
  getUserSessions,
  handleTokenRefresh,
  handleLogout,
  handleLogoutAll,
  handleGetSessions,
} from './tokenManager';

export {
  setCSRFToken,
  verifyCSRF,
  doubleSubmitCookie,
  generateCSRFToken,
} from './csrf';
