/** @type {import('jest').Config} */
module.exports = {
  rootDir: '../..',
  testMatch: ['<rootDir>/testing/unit/**/*.spec.ts'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePaths: [
    '<rootDir>/control-plane/backend/node_modules',
    '<rootDir>/node_modules',
  ],
  moduleNameMapper: {
    '^@open-derja/core$': '<rootDir>/control-plane/backend/core/src/index.ts',
    '^@open-derja/db$': '<rootDir>/db/index.ts',
  },
  setupFiles: ['<rootDir>/node_modules/reflect-metadata/Reflect.js'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/testing/unit/tsconfig.json',
      },
    ],
  },
};
