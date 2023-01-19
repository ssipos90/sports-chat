// --require ts-node/register --extensions ts,tsx --watch --watch-files src 'tests/**/*.{ts,tsx}

module.exports = {
  require: 'ts-node/register',
  spec: [
    './src/**/*.spec.ts',
    './test/**/*.spec.ts',
  ]
};
