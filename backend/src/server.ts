import { app } from './app';
import { prisma } from './lib/prisma';
import { config } from './config/env';

const server = app.listen(config.PORT, () => console.log(`Costa Sur API escuchando en http://localhost:${config.PORT}`));

const shutdown = async (signal: string) => {
  console.log(`${signal}: cerrando API...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
