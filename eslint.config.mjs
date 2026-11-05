// ESLint (flat config) — regras do projeto. Ver docs/08-boas-praticas.md
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const noFrontend = { group: ['**/apps/web/**'], message: 'A API não importa o frontend.' };

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', '**/migrations/**'] },
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
    // Arquivos de configuração em CommonJS
    files: ['**/*.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { module: 'writable', require: 'readonly', __dirname: 'readonly' },
    },
  },
  {
    // Testes podem usar recursos mais soltos
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
