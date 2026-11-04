/**
 * Testes e2e: sobem a aplicação de verdade contra o banco de teste (docker compose up -d postgres-test).
 * @type {import('jest').Config}
 */
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testRegex: 'test/.*\\.e2e-spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', isolatedModules: true }] },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@clickunicap/shared$': '<rootDir>/../../packages/shared/src',
  },
  globalSetup: '<rootDir>/test/global-setup.ts',
};
