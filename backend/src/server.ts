import { app } from './app';
import { env } from './config/env';
import { connectDb, disconnectDb } from './config/db';
import { logger } from './utils/logger';

async function main() {
  await connectDb();
    const server = app.listen(env.PORT, '0.0.0.0', () =>
    logger.info(`CommitMesh API listening on port ${env.PORT}`),
  );
  const shutdown = async (sig: string) => {
    logger.info(`${sig} received, shutting down`);
    server.close(async () => { await disconnectDb(); process.exit(0); });
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => { logger.error('Startup failed:', err.message ?? err); process.exit(1); });
