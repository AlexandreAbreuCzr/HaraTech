import 'dotenv/config';
import app from './app';
import { prisma } from './lib/prisma';

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  await prisma.$connect();
  console.log('[DB] Conectado ao PostgreSQL via Prisma');

  app.listen(PORT, () => {
    console.log(`[SERVER] Hara Tech API rodando em http://localhost:${PORT}`);
    console.log(`[SERVER] Ambiente: ${process.env.NODE_ENV ?? 'development'}`);
  });
}

main().catch((err) => {
  console.error('[FATAL] Erro ao iniciar servidor:', err);
  process.exit(1);
});
