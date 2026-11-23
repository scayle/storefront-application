import playwright from 'eslint-plugin-playwright'
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'

const LEADING_SLASH_MESSAGE =
  'A path that starts with "/" skips the country prefix of BASE_URL. Use a path relative to it, for example ROUTES.basket.'

// Self-contained flat config: the root workspace ESLint ignores `**/playwright/**`,
// so this package lints itself via its own `lint` script.
export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      globals: { ...globals.node },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**', 'page-objects/**', 'support/**'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-networkidle': 'warn',
      'playwright/no-force-option': 'warn',
      // A path that starts with `/` resolves against the origin of `baseURL` and skips its country
      // prefix. The storefront redirects an unprefixed path to the default country, so such a
      // mistake passes for the default shop and only fails for another country.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name=/^(goto|waitForURL|toHaveURL)$/][arguments.0.type='Literal'][arguments.0.value=/^\\//]",
          message: LEADING_SLASH_MESSAGE,
        },
        {
          selector:
            "CallExpression[callee.property.name=/^(goto|waitForURL|toHaveURL)$/][arguments.0.type='TemplateLiteral'][arguments.0.quasis.0.value.raw=/^\\//]",
          message: LEADING_SLASH_MESSAGE,
        },
        {
          selector:
            "CallExpression[callee.property.name='navigate'][arguments.1.type='Literal'][arguments.1.value=/^\\//]",
          message: LEADING_SLASH_MESSAGE,
        },
        {
          selector:
            "CallExpression[callee.property.name='navigate'][arguments.1.type='TemplateLiteral'][arguments.1.quasis.0.value.raw=/^\\//]",
          message: LEADING_SLASH_MESSAGE,
        },
      ],
    },
  },
]
