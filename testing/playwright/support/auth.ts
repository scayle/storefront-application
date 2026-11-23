import { existsSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { TestInfo } from '@playwright/test'
import { TEST_CUSTOMERS } from './constants'
import { getCustomerForBrowser } from './utils'

/**
 * Signed-in customers the setup projects save a session for.
 * - `default`: the dedicated customer of the browser project (see `getCustomerForBrowser`).
 * - `hydration`: `TEST_CUSTOMER_EMAIL6`, whose basket and wishlist hold items.
 *
 * The SCAYLE Authentication API accepts about 10 sign-ins per customer per minute, and every
 * browser project signs `TEST_CUSTOMER_EMAIL6` in. Saving one session per role keeps parallel
 * CI jobs under that limit. Add a role only when several tests share its customer, since each
 * role adds one sign-in per browser project to every run.
 */
export const AUTH_ROLES = ['default', 'hydration'] as const

/** Customer role a setup project signs in and a `describe` block can restore. */
export type AuthRole = (typeof AUTH_ROLES)[number]

/**
 * How old a saved file may be before `authState` rejects it. Shorter than the 30 day
 * `session.ttl` in `storefront.config.ts`, so a file left over from an earlier run is not
 * restored as a dead session.
 */
const SAVED_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000

const AUTH_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.auth')

/**
 * Resolves the file a setup project writes a role's saved session to.
 * The path is absolute so it does not depend on the directory Playwright is started from.
 *
 * @param browserProject - Browser project name, e.g. `chromium` (not the `-setup` project).
 * @param role - Customer whose session the file holds.
 * @returns Absolute path to the `storageState` JSON file.
 */
export function authFile(browserProject: string, role: AuthRole): string {
  return join(AUTH_DIR, `${browserProject}-${role}.json`)
}

/**
 * Resolves the email and password of the customer behind a role.
 *
 * @param browserProject - Browser project name, used for the `default` role.
 * @param role - Customer to resolve.
 * @returns The customer's credentials, read from `TEST_CUSTOMER_*` environment variables.
 */
export function credentialsForRole(
  browserProject: string,
  role: AuthRole,
): { email: string; password: string } {
  switch (role) {
    case 'default':
      return getCustomerForBrowser(browserProject)
    case 'hydration':
      return {
        email: TEST_CUSTOMERS.testCustomerEmail6,
        password: TEST_CUSTOMERS.testCustomerPassword,
      }
  }
}

/**
 * Starts the tests of a `describe` block from a saved, signed-in session instead of signing in
 * through the UI. Browser projects start as a guest by default, so only the blocks that call
 * this are signed in. Don't use it for tests that sign out: signing out ends the saved session on
 * the server for every later test that restores it.
 *
 * If no saved session exists (the setup project did not run, or skipped this role), or the file
 * is older than 24 hours, the tests fail here instead of timing out later on a guest page.
 *
 * @param role - Customer whose saved session to restore.
 * @returns Fixture override to pass to `test.use()`.
 *
 * @example
 * test.describe('Account area', () => {
 *   test.use(authState('default'))
 *   // ...
 * })
 */
export function authState(role: AuthRole) {
  return {
    storageState: async (
      {}: object,
      use: (path: string) => Promise<void>,
      testInfo: TestInfo,
    ) => {
      const file = authFile(testInfo.project.name, role)
      const [setupProject] = testInfo.project.dependencies
      const runSetupHint =
        `Run the "${setupProject}" project first. UI mode and the VS Code extension skip setup ` +
        `projects unless they are selected.`
      if (!existsSync(file)) {
        throw new Error(
          `No saved session for role "${role}" in project "${testInfo.project.name}". The ` +
            `"${setupProject}" project may have skipped this role, and its skip message says ` +
            `why. Otherwise it did not run. ${runSetupHint}`,
        )
      }
      if (Date.now() - statSync(file).mtimeMs > SAVED_SESSION_MAX_AGE_MS) {
        throw new Error(
          `The saved session for role "${role}" in project "${testInfo.project.name}" is older than ` +
            `24 hours, so it is not restored. ${runSetupHint}`,
        )
      }
      await use(file)
    },
  }
}
