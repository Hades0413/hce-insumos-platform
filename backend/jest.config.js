module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  collectCoverageFrom: ['apps/**/src/**/*.ts', 'libs/**/src/**/*.ts', '!**/main.ts', '!**/index.ts', '!**/*.module.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  roots: ['<rootDir>/apps/', '<rootDir>/libs/'],
  moduleNameMapper: {
    '^@hce/contracts(|/.*)$': '<rootDir>/libs/contracts/src/$1',
    '^@hce/core(|/.*)$': '<rootDir>/libs/core/src/$1',
    '^@hce/common(|/.*)$': '<rootDir>/libs/common/src/$1',
  },
};
