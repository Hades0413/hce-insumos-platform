/** @type {import('jest').Config} */
module.exports = {
  ...require('./jest.config.js'),
  testRegex: '.*\\.e2e-spec\\.ts$',
  roots: ['<rootDir>/apps/'],
};
