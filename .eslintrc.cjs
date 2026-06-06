module.exports = {
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'indent': ['error', 2],
    'max-len': ['warn', { code: 120, ignoreStrings: true, ignoreTemplateLiterals: true }],
    'no-const-assign': 'error',
    'no-dupe-keys': 'error',
    'no-func-assign': 'error',
    'no-new-symbol': 'error',
    'no-obj-calls': 'error',
    'no-self-compare': 'error',
    'no-unexpected-multiline': 'error',
    'no-unreachable': 'error',
    'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    'arrow-parens': ['error', 'as-needed'],
    'prefer-const': 'error'
  }
};
