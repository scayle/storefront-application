import storefrontV3 from '@scayle/eslint-config-storefront/v3'

// Anchors the import resolver and the no-restricted-paths zones below to this file's own
// directory, not ESLint's working directory. Without it, both fall back to `process.cwd()`:
// correct when `pnpm lint` runs via Turborepo (cwd is always the package directory there),
// but not guaranteed for an editor's ESLint extension, which can run with the workspace root
// as cwd instead. VS Code's `eslint.workingDirectories` glob doesn't currently match this
// directory, so this file being cwd-independent is what keeps editor lint feedback correct.
const projectRoot = new URL('.', import.meta.url).pathname

// `@scayle/storefront/test` imports `vitest`, an optional peer that is not
// installed in production. Importing either outside a test bundles the test
// runner into the server output or fails to resolve at runtime.
const productionOnlyImports = [
  {
    name: '@scayle/storefront/test',
    message:
      'Test doubles are for test files only. Import them from `*.test.ts` or `src/test/`.',
  },
  {
    name: 'vitest',
    message:
      '`vitest` is not installed in production. Import it from `*.test.ts` or `src/test/` only.',
  },
]

const inertiaUsePageImport = {
  name: '@inertiajs/vue3',
  importNames: ['usePage'],
  message:
    "Import `usePage` from `@client/composables/usePage`. Inertia's own types page props through an index signature, so a misspelled prop name resolves to `unknown` instead of failing to compile.",
}

export default storefrontV3({
  typescript: {
    tsconfigPath: `${projectRoot}tsconfig.json`,
  },
  resolver: {
    tsconfigPath: `${projectRoot}tsconfig.json`,
  },
  tailwind: {
    entryPoint: './src/client/index.css',
  },
  i18n: {
    localeDir: './src/i18n/locales/*.json',
    unusedKeyIgnores: [
      // Following keys are used dynamically in the codebase and are not seen as 'used' by this rule.
      // The static usage of the keys would make the codebase harder to read and maintain.
      '/global.payment_key/',
      '/global.carrier_key/',
      '/country_detection.override_codes/',
      '/subscription.ordinal_suffix/',
      '/sorting_select/',
    ],
  },
  vue: {
    // Ignore custom elements (web components)
    undefComponentIgnores: [
      'scayle-checkout',
      'scayle-auth',
      'scayle-auth-new-password',
      'scayle-express-checkout',
      'subscription-overview',
      'subscription-cancellation',
    ],
  },
  vueComposable: {
    // Pages and layouts are mounted by Inertia as route roots / layout wrappers
    // and never receive fallthrough attributes.
    fallthroughAttrsIgnores: ['/src/client/pages/', '/src/client/layout/'],
  },
}).append([
  // Global Ignored
  {
    ignores: [
      'build/**',
      'coverage/**',
      '.storybook/**',
      '.vscode/**',
      'node_modules/**',
      // Generated CMS types (`pnpm cms:sync`)
      '**/types/cms/**/gen/**',
      // CMS content models exported from the provider (`pnpm cms:sync`)
      '.scayle/cms/**',
      // Separate pnpm packages that Node runs directly. They need `.ts` import
      // extensions, which the root `import-x/extensions` rule forbids.
      'testing/**',
    ],
  },
  {
    rules: {
      'better-tailwindcss/no-unknown-classes': [
        'error',
        {
          ignore: ['block-scrolling', 'picture'],
        },
      ],
    },
  },
  // Pages and layouts use single-word names by Inertia convention (kept here since it
  // targets this app's own page/layout paths, not a generic Vue rule)
  {
    files: ['src/client/pages/**/*.vue', 'src/client/layout/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  // Custom code styling not covered by Prettier
  {
    rules: {
      'import-x/newline-after-import': ['error', { count: 1 }],
      'import-x/no-extraneous-dependencies': 'error',
      // Limit cycle detection depth to avoid excessive memory usage from deep import graph traversal (e.g. CMS components).
      'import-x/no-cycle': ['error', { maxDepth: 5 }],
      // Enforce the use of the correct file extensions.
      // https://github.com/un-ts/eslint-plugin-import-x/blob/HEAD/docs/rules/extensions.md
      'import-x/extensions': [
        'error',
        'never',
        {
          fix: true,
          pattern: {
            config: 'always',
            vue: 'always',
            json: 'always',
            svg: 'always',
            avif: 'always',
            webp: 'always',
          },
        },
      ],
      // Prevent imports from client code to the server code and vice versa.
      // It is used to enforce the use of the correct import paths.
      // https://github.com/un-ts/eslint-plugin-import-x/blob/HEAD/docs/rules/no-restricted-paths.md
      'import-x/no-restricted-paths': [
        'error',
        {
          // Same cwd-independence reasoning as `resolver.tsconfigPath` above: without an
          // explicit basePath, zone paths resolve against `process.cwd()`, which isn't
          // guaranteed to be this directory outside `pnpm lint`/CI.
          basePath: projectRoot,
          zones: [
            {
              target: './src/client/',
              from: './src/server',
              except: ['./api/index.ts'],
            },
            {
              target: './src/server/',
              from: './src/client',
            },
            {
              target: './src/shared/',
              from: './src/client',
            },
            {
              target: './src/shared/',
              from: './src/server',
            },
          ],
        },
      ],
    },
  },
  // SonarJS
  {
    rules: {
      'sonarjs/redundant-type-aliases': 'warn',
    },
  },
  // Tests, stories and `src/test/**` are not exempt: a stray `console` call there is
  // debug output left behind. `src/**` production code is held to `error` further down.
  {
    rules: {
      'no-console': 'warn',
    },
  },
  // Unit tests. Stories and `src/test/**` are not listed because none of these rules
  // fire there.
  {
    files: ['**/*.test.ts', '**/*.vue.test.ts'],
    rules: {
      // A `describe` is named after the component, class or function under test, which
      // keeps that identifier's casing. Test titles still start lowercase.
      'vitest/prefer-lowercase-title': ['error', { ignore: ['describe'] }],
      // Tests declare several small stub components inline to mount a parent or fill a slot.
      'vue/one-component-per-file': 'off',
      // Stub components list their props as a name array, since the types do not matter
      // to the test.
      'vue/require-prop-types': 'off',
      // A bare `.then` in a test only records that a promise settled. A rejection there
      // already fails the run as an unhandled rejection.
      'promise/catch-or-return': 'off',
      'promise/always-return': 'off',
    },
  },
  // Vite's own config loader wants an explicit extension on files it loads outside
  // the app's module graph (its "planned to become the default" native config loader
  // already warns without one), which conflicts with import-x/extensions' project-wide
  // `never` policy for .ts.
  {
    files: ['vite.config.ts', 'vitest.config.ts'],
    rules: {
      'import-x/extensions': [
        'error',
        'never',
        {
          fix: true,
          pattern: {
            ts: 'always',
            config: 'always',
            vue: 'always',
            json: 'always',
            svg: 'always',
            avif: 'always',
            webp: 'always',
          },
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,vue}'],
    // `src/test/**` holds test utilities, so it may import the test-only doubles.
    ignores: ['**/*.test.ts', 'src/test/**'],
    rules: {
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        { paths: [...productionOnlyImports, inertiaUsePageImport] },
      ],
      // Inertia's `<Head>` writes text children into the server-rendered HTML
      // as they are; only attribute values and its own `title` prop are escaped.
      // It also drops the `title` prop as soon as any `<title>` child exists,
      // even a static one or one using `v-text`.
      'vue/no-restricted-syntax': [
        'error',
        {
          selector:
            "VElement[rawName='Head'] > VExpressionContainer, VElement[rawName='Head'] VElement > VExpressionContainer",
          message:
            'Text interpolated inside <Head> is not escaped on the server. Use the `title` prop or an attribute binding.',
        },
        {
          selector: "VElement[rawName='Head'] VElement[rawName='title']",
          message:
            'A <title> child makes Inertia drop the `title` prop of <Head>. Pass the title through the prop instead.',
        },
      ],
    },
  },
  {
    // `messagesServer` bundles every locale file into the importing module, so
    // one import from browser code ships all of them to every user. `ssr.ts`
    // runs on the server only. Flat config replaces a rule's options instead of
    // merging them, so the `paths` of the block above are repeated.
    files: ['src/client/**/*.{ts,vue}', 'src/shared/**/*.ts'],
    ignores: ['src/client/ssr.ts', '**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...productionOnlyImports, inertiaUsePageImport],
          patterns: [
            {
              group: ['**/i18n/messagesServer'],
              message:
                'Bundles every locale into the client. Use `loadLocaleMessages` from `src/i18n/messagesBrowser.ts`.',
            },
          ],
        },
      ],
    },
  },
  {
    // `inertia.navigate()` localizes a site-relative target for the active
    // country and sends an external one with a full page load. `ctx.redirect`
    // does neither, so a page redirect through it lands in the wrong shop or
    // fails CORS on an Inertia visit. See "Redirects" in src/server/CLAUDE.md.
    files: ['src/server/controllers/**/*.ts', 'src/server/ssr-routes.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='redirect']:matches([callee.object.name='ctx'], [callee.object.property.name='ctx'])",
          message:
            'Redirect with `inertia.navigate()` (or `inertia.redirect()` for a non-Inertia route), not `ctx.redirect`.',
        },
      ],
    },
  },
  {
    // Stories mock `usePage` with `mocked()`, which only works on the module
    // `.storybook/main.ts` aliases to `.storybook/inertia-mock.ts`. Pointed at
    // the wrapper instead, `mocked()` returns the real function and
    // `mockReturnValue` is undefined at runtime.
    files: ['**/*.stories.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: productionOnlyImports }],
    },
  },
])
