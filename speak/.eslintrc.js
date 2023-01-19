module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
  },
  extends: 'standard-with-typescript',
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: [
      'tsconfig.json',
    ],
  },
  rules: {
    semi: ['error', 'always'],
    '@typescript-eslint/semi': ['error', 'always'],
    'comma-dangle': ['warn', 'always-multiline'],
    '@typescript-eslint/comma-dangle': ['warn', 'always-multiline'],
  },
  plugins: [
    'mocha',
  ],
};
