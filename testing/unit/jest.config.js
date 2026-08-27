/** @type {import('jest').Config} */
module.exports = {
  rootDir: '../..',
  testMatch: ['<rootDir>/testing/unit/**/*.spec.ts'],
  preset: 'ts-jest',
  testEnvironment: 'node',
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
