/**
 * Testes unitários: arquivos *.spec.ts ao lado do código (src/).
 * Os e2e ficam em test/ e usam test/jest-e2e.config.js.
 * @type {import('jest').Config}
 */
module.exports = {
  rootDir: 'src',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json', isolatedModules: true }] },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@clickunicap/shared$': '<rootDir>/../../../packages/shared/src',
  },
  collectCoverageFrom: ['**/*.ts', '!**/*.module.ts', '!main.ts', '!**/schema/**', '!**/migrations/**'],
  coverageDirectory: '../coverage',
};
