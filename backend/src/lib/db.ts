import { PrismaClient } from '@prisma/client';

// Declare global type for PrismaClient caching in serverless
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create PrismaClient instance
// NeonDB connection pooling is handled at the URL level with pooler endpoint
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
    // Connection settings optimized for serverless
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

// Singleton pattern to prevent multiple PrismaClient instances
// Important for serverless environments where function instances may be reused
export const prisma = global.prisma ?? createPrismaClient();

// Cache PrismaClient in development to prevent hot reload issues
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Graceful shutdown helper
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

export default prisma;
