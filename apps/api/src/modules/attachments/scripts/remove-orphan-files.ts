/* eslint-disable no-console -- script de terminal */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { AttachmentsService } from '../attachments.service';

const DEFAULT_MINUTES = 60;

/** Lê `--older-than=<minutos>` (padrão 60). */
export function parseOlderThanMinutes(args: readonly string[]): number {
  const arg = args.find((value) => value.startsWith('--older-than='));
  if (!arg) return DEFAULT_MINUTES;
  const minutes = Number(arg.slice('--older-than='.length));
  if (!Number.isInteger(minutes) || minutes < 1) throw new Error('Use --older-than=<minutos>, um inteiro maior que 0.');
  return minutes;
}

/**
 * Limpeza de arquivos órfãos do storage de anexos: pnpm --filter api attachments:orphans [--older-than=60]
 * Apaga só arquivos sem registro no banco e mais antigos que o limite (um envio em andamento nunca é tocado).
 */
async function main() {
  const minutes = parseOlderThanMinutes(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const olderThan = new Date(Date.now() - minutes * 60_000);
    const removed = await app.get(AttachmentsService).removeOrphanFiles(olderThan);
    console.log(`Arquivos órfãos removidos (mais antigos que ${minutes} min): ${removed}`);
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
