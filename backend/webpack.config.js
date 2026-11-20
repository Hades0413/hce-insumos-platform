const path = require('node:path');

const libs = {
  '@hce/contracts': path.resolve(__dirname, 'libs/contracts/src'),
  '@hce/core': path.resolve(__dirname, 'libs/core/src'),
  '@hce/common': path.resolve(__dirname, 'libs/common/src'),
};

module.exports = (options) => ({
  ...options,
  resolve: {
    ...options.resolve,
    alias: { ...options.resolve?.alias, ...libs },
    plugins: (options.resolve?.plugins ?? []).filter((p) => p?.constructor?.name !== 'TsconfigPathsPlugin'),
  },
});
