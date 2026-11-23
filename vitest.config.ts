import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import type { UserConfig } from 'vite'
import viteConfig from './vite.config.ts'
import { isCustomWebComponent } from './config/customWebComponents.ts'

const rootDir = fileURLToPath(new URL('./', import.meta.url))

/** Resolve alias for projects with root other than repo root (so @client etc. resolve correctly). */
const resolveAlias = {
  '@assets': path.resolve(rootDir, 'src/client/assets'),
  '@client': path.resolve(rootDir, 'src/client'),
  '@shared': path.resolve(rootDir, 'src/shared'),
  '@server': path.resolve(rootDir, 'src/server'),
  '@cms-server': path.resolve(rootDir, 'src/server/cms/providers/scayle'),
  '@cms-client': path.resolve(rootDir, 'src/client/cms/providers/scayle'),
  '@cms-shared': path.resolve(rootDir, 'src/shared/types/cms/scayle'),
  '@test': path.resolve(rootDir, 'src/test'),
  // In production, @scayle/storefront-build's storefrontConfigPlugin resolves this
  // virtual module to the app's storefront.config.ts. Tests run outside Vite, so
  // we alias it directly to the same file. Env vars from test.env feed process.env.
  'virtual:storefront-config': path.resolve(rootDir, 'storefront.config.ts'),
}

// When @scayle/storefront is a registry dependency (standalone project) rather than
// a workspace symlink, Vitest externalizes it, so its `virtual:storefront-config`
// import goes to Node's ESM loader, which rejects the `virtual:` scheme. Inlining
// keeps the package in Vite's pipeline, where the alias above resolves the virtual
// module. Not inherited from the root test config; must be set on each project.
// The regex runs against the resolved module path, so it is anchored on the
// package directory to avoid also inlining @scayle/storefront-api and the other
// sibling packages.
const serverDeps = {
  deps: { inline: [/\/node_modules\/@scayle\/storefront\//] },
}

// Error-path tests log through the real `@scayle/storefront` logger, whose lines
// would bury real warnings: JSON on the server, `storefront:<namespace>` in the
// browser. `vi.mock('tslog')` cannot silence it from the application, because
// `tslog` is a dependency of `@scayle/storefront`, not of the application.
const STRUCTURED_LOG_LINE = /^(?:\{"timestamp":|storefront:)/

// A project with `extends: false` ignores root `test` options such as `exclude`,
// so options every project needs are spread into each project's `test` instead.
// Restoring spies, env stubs and global stubs before every test keeps a test from
// inheriting what an earlier one changed, so the suite passes in any order.
const restoreMocksAndStubs = {
  restoreMocks: true,
  unstubEnvs: true,
  unstubGlobals: true,
}

export default defineConfig(async (configEnv) => {
  // `vite.config` can export a function; resolve it first so `mergeConfig` gets a plain object.
  const resolvedViteConfig =
    typeof viteConfig === 'function'
      ? ((await viteConfig(configEnv)) as UserConfig)
      : (viteConfig as UserConfig)

  return mergeConfig(resolvedViteConfig, {
    test: {
      env: {
        // Set evn vars from storefront.config.ts during tests
        STOREFRONT_TENANT_SPACE: 'test-tenant-space',
        STOREFRONT_SHOP_KEY: 'test-shop-key',
        STOREFRONT_COUNTRIES_DE_SHOP_COUNTRY_ID: '9001',
        STOREFRONT_COUNTRIES_US_SHOP_COUNTRY_ID: '9002',
        STOREFRONT_COUNTRIES_AT_SHOP_COUNTRY_ID: '9003',
        STOREFRONT_API_KEY: 'test-storefront-api-key',
        STOREFRONT_OAUTH_CLIENT_ID: 'test-oauth-client-id',
        STOREFRONT_OAUTH_CLIENT_SECRET: 'test-oauth-client-secret',
        STOREFRONT_COUNTRIES_DE_CHECKOUT_USER: 'test-user-de',
        STOREFRONT_COUNTRIES_DE_CHECKOUT_TOKEN: 'test-token-de',
        STOREFRONT_COUNTRIES_DE_CHECKOUT_SECRET: 'test-secret-de',
        STOREFRONT_COUNTRIES_US_CHECKOUT_USER: 'test-user-us',
        STOREFRONT_COUNTRIES_US_CHECKOUT_TOKEN: 'test-token-us',
        STOREFRONT_COUNTRIES_US_CHECKOUT_SECRET: 'test-secret-us',
        STOREFRONT_COUNTRIES_AT_CHECKOUT_USER: 'test-user-at',
        STOREFRONT_COUNTRIES_AT_CHECKOUT_TOKEN: 'test-token-at',
        STOREFRONT_COUNTRIES_AT_CHECKOUT_SECRET: 'test-secret-at',
        STOREFRONT_SESSION_SECRET: 'test_session_secret_must_be_32_chars!',
      },
      onConsoleLog: (log: string) => !STRUCTURED_LOG_LINE.test(log),
      root: rootDir,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,js,vue}', 'scripts/**/*.{ts,js,mjs}'],
        reporter: ['text', 'cobertura'],
        reportsDirectory: 'coverage',

        exclude: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/.output/**',
          '**/.cursor/**',
          '**/.vscode/**',
          '**/.git/**',
          '**/*.stories.ts',
          '**/*.d.ts',
          '**/*.test-d.ts',
          '**/.storybook/**',
          '**/storybook-static/**',
          '**/test/**',
          '**/testing/**',
          '**/gen/**',
        ],
        thresholds: {
          lines: 87,
          statements: 87,
          branches: 83,
          functions: 83,
        },
      },
      projects: [
        {
          extends: false,
          plugins: [
            vue({
              template: {
                compilerOptions: {
                  isCustomElement: isCustomWebComponent,
                },
              },
            }),
          ],
          resolve: { alias: resolveAlias },
          test: {
            ...restoreMocksAndStubs,
            name: 'v3:boilerplate:components',
            dir: './src/client',
            include: ['**/*.vue.test.ts'],
            environment: 'happy-dom',
            pool: 'vmThreads',
            // happy-dom never fetches the web component scripts that tests inject.
            // Treating the refused load as a success keeps its stack trace out of the run.
            environmentOptions: {
              happyDOM: {
                settings: { handleDisabledFileLoadingAsSuccess: true },
              },
            },
            setupFiles: [path.resolve(rootDir, 'src/test/autoUnmount.ts')],
            server: serverDeps,
          },
        },
        {
          extends: false,
          resolve: { alias: resolveAlias },
          test: {
            ...restoreMocksAndStubs,
            name: 'v3:boilerplate:client',
            dir: './src/client',
            exclude: ['**/*.vue.test.ts'],
            environment: 'node',
            server: serverDeps,
          },
        },
        {
          extends: false,
          resolve: { alias: resolveAlias },
          test: {
            ...restoreMocksAndStubs,
            name: 'v3:boilerplate:shared',
            dir: './src/shared',
            environment: 'node',
            server: serverDeps,
          },
        },
        {
          extends: false,
          resolve: { alias: resolveAlias },
          test: {
            ...restoreMocksAndStubs,
            name: 'v3:boilerplate:i18n',
            dir: './src/i18n',
            environment: 'node',
            server: serverDeps,
          },
        },
        {
          extends: false,
          resolve: { alias: resolveAlias },
          test: {
            ...restoreMocksAndStubs,
            name: 'v3:boilerplate:server',
            dir: './src/server',
            environment: 'node',
            server: serverDeps,
          },
        },
        {
          extends: false,
          test: {
            ...restoreMocksAndStubs,
            name: 'v3:boilerplate:scripts',
            dir: './scripts',
            environment: 'node',
            server: serverDeps,
            // cache.test.ts runs against a live server and has its own config
            // (scripts/vitest.config.ts), so it stays out of the default run.
            exclude: ['**/cache.test.ts'],
          },
        },
      ],
    },
  })
})
