import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig(({ mode }) => {
  // O .env fica na raiz do monorepo, compartilhado com a API
  const env = loadEnv(mode, repoRoot, '');

  return {
    envDir: repoRoot,
    plugins: [react()],
    resolve: {
      alias: {
        '@': fromHere('./src'),
        // O shared compila para CommonJS (para a API); o frontend usa o código-fonte direto
        '@clickunicap/shared': fromHere('../../packages/shared/src/index.ts'),
      },
    },
    server: {
      port: Number(env.WEB_PORT ?? 5173),
      proxy: { '/api': `http://localhost:${env.API_PORT ?? 3000}` },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
