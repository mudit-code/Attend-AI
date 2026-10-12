import app from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { logger } from './lib/logger';

async function main() {
  // Test DB connection
  await prisma.$connect();
  logger.info('Database connected');

  // Connect Redis
  await redis.connect();

  const server = app.listen(env.PORT, () => {
    logger.info(`AttendAI backend running on port ${env.PORT}`, {
      env: env.NODE_ENV,
      version: env.APP_VERSION,
    });
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await prisma.$disconnect();
      await redis.quit();
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Failed to start server', { err });
  process.exit(1);
});
