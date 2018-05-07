module.exports = {
  root: true,
  globals: {
    server: true,
    define: true
  },
  extends: ['prettier', 'plugin:ember/recommended'],
  parser: 'typescript-eslint-parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  env: {
    browser: true,
    node: true
  },
  rules: {
    'no-implicit-globals': [1],
    'prettier/prettier': ['error', { singleQuote: true, printWidth: 120 }]
  },
  plugins: ['prettier', 'ember', 'typescript'],
  overrides: [
    // node files
    {
      files: ['testem.js', 'ember-cli-build.js', 'config/**/*.js'],
      parserOptions: {
        sourceType: 'script',
        ecmaVersion: 2015
      },
      env: {
        browser: false,
        node: true
      }
    },

    // test files
    {
      files: ['tests/**/*.js'],
      excludedFiles: ['tests/dummy/**/*.js'],
      env: {
        embertest: true
      }
    }
  ]
};
