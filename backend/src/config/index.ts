import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];

// Validate required environment variables
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
export const configError = missingVars.length > 0
  ? `Missing required environment variables: ${missingVars.join(', ')}. Please add them to your Vercel project settings.`
  : null;

// Validate JWT_SECRET strength in production
const jwtSecret = process.env.JWT_SECRET || '';
const isWeakSecret = jwtSecret.length < 32 || jwtSecret === 'your-super-secure-jwt-secret-key-min-32-chars';
export const secretWarning = isWeakSecret && process.env.NODE_ENV === 'production'
  ? 'WARNING: JWT_SECRET is too weak for production. Use at least 32 random characters.'
  : null;

// Only crash in non-serverless environments
if (missingVars.length > 0 && !process.env.VERCEL) {
  process.stderr.write(configError + '\n');
  process.exit(1);
}

// Warn about weak secrets (don't crash, but log)
if (secretWarning && !process.env.VERCEL) {
  process.stderr.write(secretWarning + '\n');
}

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // Security
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs',
  },

  // Session
  session: {
    timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30', 10),
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '3', 10),
  },

  // Email
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'noreply@hospital.com',
  },

  // File Upload
  upload: {
    maxSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
    dir: process.env.UPLOAD_DIR || './uploads',
  },

  // Payment Gateway - Razorpay
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    enabled: !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET,
  },
} as const;

export type Config = typeof config;
