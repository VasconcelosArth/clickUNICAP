// ESLint (flat config) — regras do projeto. Ver docs/08-boas-praticas.md
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const noFrontend = { group: ['**/apps/web/**'], message: 'A API não importa o frontend.' };
const noBackend = { group: ['**/apps/api/**'], message: 'O frontend não importa a API.' };
const featureInternals = { group: ['@/features/*/*'], message: 'Importe só do index.ts da feature.' };

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', '**/migrations/**', '**/mockServiceWorker.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'error',
    },
  },
  {
    // Fronteira: o backend nunca importa o frontend e vice-versa
    files: ['apps/api/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [noFrontend] }],
    },
  },
  {
    // Fronteira: dentro do módulo o import é relativo, então o alias só aparece ao cruzar módulos
    files: ['apps/api/src/modules/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            noFrontend,
            { group: ['@/modules/*/*.repository'], message: 'Use o service exportado pelo módulo ou um evento.' },
          ],
        },
      ],
    },
  },
  {
    // Fronteira: o core é usado por todos e não conhece nenhum módulo
    files: ['apps/api/src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [noFrontend, { group: ['@/modules/**'], message: 'O core não importa módulos de negócio.' }] },
      ],
    },
  },
  {
    // Fronteira: quem está fora de uma feature importa só o index.ts dela
    files: ['apps/web/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [noBackend, featureInternals] }],
    },
  },
  {
    // Fronteira: uma feature não importa outra; a exceção é a API pública de tasks (docs/05-frontend-guia.md)
    files: ['apps/web/src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            noBackend,
            featureInternals,
            { group: ['@/features/*', '!@/features/tasks'], message: 'Features não importam outras features.' },
          ],
        },
      ],
    },
  },
  {
    // Fronteira: as camadas compartilhadas não conhecem features nem o app
    files: ['apps/web/src/{components,hooks,lib,stores}/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            noBackend,
            { group: ['@/features/**', '@/app/**'], message: 'Código compartilhado não conhece features nem o app.' },
          ],
        },
      ],
    },
  },
  {
    // Os mocks juntam os handlers de todas as features
    files: ['apps/web/src/mocks/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [noBackend] }],
    },
  },
  {
    // Arquivos de configuração em CommonJS
    files: ['**/*.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { module: 'writable', require: 'readonly', __dirname: 'readonly' },
    },
  },
  {
    // Testes podem usar recursos mais soltos
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.test.tsx', '**/*.e2e-spec.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
