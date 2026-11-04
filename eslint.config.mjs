// ESLint (flat config) — regras do projeto. Ver docs/08-boas-praticas.md
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

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
      'no-restricted-imports': ['error', { patterns: [{ group: ['**/apps/web/**'], message: 'A API não importa o frontend.' }] }],
    },
  },
  {
    // Arquivos de configuração em CommonJS
    files: ['**/*.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: { module: 'writable', require: 'readonly', __dirname: 'readonly' } },
  },
  {
    // Testes podem usar recursos mais soltos
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
