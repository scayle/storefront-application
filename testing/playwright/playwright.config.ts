import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PlaywrightTestConfig } from '@playwright/test'
import { defineConfig, devices } from '@playwright/test'

// Read environment variables from file if not running in CI.
// E.g. used for `BASE_URL` environment variable.
// Resolve relative to this config file so Playwright works regardless of `process.cwd()`.
const configDir = dirname(fileURLToPath(import.meta.url))
const e2eEnvPath = join(configDir, '.env')
const appEnvPath = join(configDir, '../../.env')

if (!process.env.CI) {
  // `process.loadEnvFile` never overwrites a key already present in `process.env`,
  // so the first load wins and a value exported in the shell beats both files.
  // The E2E file loads first to give it precedence over the app's.
  // https://nodejs.org/docs/latest-v20.x/api/process.html#processloadenvfilepath
  try {
    process.loadEnvFile(e2eEnvPath)
  } catch {
    console.warn(
      `Warning: E2E .env file not found at ${e2eEnvPath}. Falling back to the app .env and defaults.`,
    )
  }

  try {
    process.loadEnvFile(appEnvPath) // Boilerplate project root (parent of `testing/`)
  } catch {
    console.warn(
      `Warning: .env file for test suite not found at ${appEnvPath}. Using default configuration.`,
    )
  }
}

/**
 * Validates `BASE_URL` and adds a trailing slash to its path when it has none.
 *
 * @param url - URL of the shop under test.
 * @returns The URL with a trailing slash on its path.
 * @throws When the URL has a query string or a hash, which relative paths would silently drop.
 */
function normalizeBaseUrl(url: string): string {
  const parsed = new URL(url)
  if (parsed.search || parsed.hash) {
    throw new Error(
      `BASE_URL must be the homepage of the shop under test without a query string or hash, for example https://localhost:3000/de/. Got ${url}`,
    )
  }
  if (!parsed.pathname.endsWith('/')) {
    parsed.pathname += '/'
  }
  return parsed.href
}

/**
 * The storefront URL under test. `BASE_URL` holds the origin and the country prefix, with a
 * trailing slash (for example `https://localhost:3000/de/`), the same shape locally and in CI.
 * Specs navigate with paths relative to it (`ROUTES.basket`), so the same specs run against
 * another country or a shop without a country prefix by changing this value. It falls back to
 * `https://localhost:3000/de/` when unset or empty, and a local .env file can provide it.
 *
 * A missing trailing slash is added, since Playwright resolves relative paths against the URL
 * and would otherwise drop the last segment, the country prefix. A query string or hash is
 * rejected, because a relative path drops it.
 */
const BASE_URL = normalizeBaseUrl(
  process.env.BASE_URL || 'https://localhost:3000/de/',
)

const AUTH_SETUP_FILE = /auth\.setup\.ts$/
const SETUP_PROJECT_SUFFIX = '-setup'
const A11Y_CRAWL_FILE = /a11y-crawl\.e2e\.spec\.ts$/
// The crawl scans a shop from `BASE_URL` alone. Its projects exist only with `A11Y=1`, so a normal
// run never crawls (`pnpm test:e2e:a11y` sets it).
const A11Y_CRAWL_PROJECTS =
  process.env.A11Y === '1'
    ? [
        { name: 'a11y-crawl', device: devices['Desktop Chrome'] },
        { name: 'a11y-crawl-mobile', device: devices['Galaxy S9+'] },
      ].map(({ name, device }) => ({
        name,
        testMatch: A11Y_CRAWL_FILE,
        use: { ...device },
      }))
    : []

const BROWSERS = [
  { name: 'chromium', device: devices['Desktop Chrome'] },
  { name: 'mobile-chrome', device: devices['Galaxy S9+'] },
  { name: 'firefox', device: devices['Desktop Firefox'] },
  { name: 'webkit', device: devices['Desktop Safari'] },
  { name: 'mobile-safari', device: devices['iPhone 15'] },
]

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export const playwrightConfig: PlaywrightTestConfig = {
  testDir: './tests',
  // Run tests in files in parallel
  fullyParallel: true,
  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  // Opt out of parallel tests on CI.
  workers: process.env.CI ? 1 : undefined,
  // Reporter to use. See https://playwright.dev/docs/test-reporters
  // The TestRail reporter is opt-in via TESTRAIL_RUN_ID so forks without TestRail
  // credentials don't get it by default.
  reporter: [
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['list', { printSteps: true }],
    ['./reporters/skip-rate-reporter.ts'],
    ...(process.env.TESTRAIL_RUN_ID
      ? ([['playwright-testrail-reporter']] as const)
      : []),
  ],
  // Shared settings for all the projects below.
  // See https://playwright.dev/docs/api/class-testoptions
  use: {
    // Country-scoped base: a path without a leading slash (`basket`, `./`) resolves under the
    // country prefix, while a path that starts with `/` resolves against the origin.
    baseURL: BASE_URL,
    // Collect trace when retrying the failed test.
    // See https://playwright.dev/docs/trace-viewer
    trace: 'on-first-retry',
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
  },
  // Every browser project depends only on its own setup project, which saves the signed-in
  // sessions (see `tests/auth.setup.ts`). A run limited to one browser (`--project=webkit`) then
  // signs in only that browser's customers. Browser projects start as a guest; tests opt into a
  // saved session with `test.use(authState(role))` from `support/auth.ts`.
  projects: [
    ...BROWSERS.flatMap(({ name, device }) => [
      {
        name: `${name}${SETUP_PROJECT_SUFFIX}`,
        testMatch: AUTH_SETUP_FILE,
        metadata: { browserProject: name },
        // Bounds each step of the sign-in, so a hang fails fast enough for the setup to skip
        // instead of running into its own timeout, which stops the whole browser project. Traces stay
        // off because a retried setup would record the typed password in the CI artifact.
        use: { ...device, actionTimeout: 20_000, trace: 'off' },
      },
      {
        name,
        testIgnore: [AUTH_SETUP_FILE, A11Y_CRAWL_FILE],
        dependencies: [`${name}${SETUP_PROJECT_SUFFIX}`],
        use: { ...device },
      },
    ]),
    ...A11Y_CRAWL_PROJECTS,
  ],
}

export default defineConfig(playwrightConfig)
