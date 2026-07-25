import js from '@eslint/js';
import globals from 'globals';

// Flat config, required by ESLint 9. This is a direct translation of the old
// .eslintrc.json — same rules, same severities — with two deliberate changes:
//
//  1. `no-new-symbol` was removed in ESLint 9 and replaced by
//     `no-new-native-nonconstructor`, which covers Symbol and also catches
//     `new BigInt()`. Same intent, wider net.
//  2. Globals are now declared per file group instead of one flat `env` block,
//     so service-worker.js gets the ServiceWorker globals (self, clients,
//     registration) that browser globals alone do not provide.
//
// The formatting rules (indent/quotes/semi/max-len) are deprecated in 9 but
// still shipped and still enforced. They are slated for removal in ESLint 10,
// which is why this upgrade stops at 9 — moving to 10 means adopting
// @stylistic/eslint-plugin for those four rules.

const rules = {
  // ESLint 9 changed the caughtErrors default from 'none' to 'all', so unused
  // catch bindings are now reported. Keeping the stricter default and matching
  // the existing ^_ escape hatch rather than opting back out.
  'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
  'no-console': 'off',
  semi: ['error', 'always'],
  quotes: ['error', 'single'],
  indent: ['error', 2, { SwitchCase: 1 }],
  'max-len': ['warn', { code: 130, ignoreStrings: true, ignoreTemplateLiterals: true }],
  'no-const-assign': 'error',
  'no-dupe-keys': 'error',
  'no-func-assign': 'error',
  'no-new-native-nonconstructor': 'error',
  'no-obj-calls': 'error',
  'no-self-compare': 'error',
  'no-unexpected-multiline': 'error',
  'no-unreachable': 'error',
  'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
  'arrow-parens': 'off',
  'prefer-const': 'off'
};

export default [
  // Replaces .eslintignore, which ESLint 9 no longer reads.
  { ignores: ['js/vendor/**', 'node_modules/**', 'film/**', 'dist/**'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node }
    },
    rules
  },
  {
    files: ['service-worker.js', 'js/service-worker.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.serviceworker, ...globals.browser }
    },
    rules
  }
];
