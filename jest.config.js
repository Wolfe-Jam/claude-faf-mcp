/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  // Perf tests run via npm run test:performance (continue-on-error in CI).
  // Hard timing assertions on shared CI runners are flaky by nature, so they
  // do NOT gate the main test run — observability, not a gate.
  testPathIgnorePatterns: ['/node_modules/', 'performance.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
  // Tests run in-band (package.json `test` → `jest --runInBand`). Serial
  // execution removes Jest's worker pool — the source of the intermittent
  // "worker failed to exit gracefully" red on constrained Windows/macOS CI
  // runners. In-band exits clean on its own (--detectOpenHandles reports ZERO
  // open handles), so no forceExit is needed — and forceExit was suppressing
  // that very diagnostic.
};