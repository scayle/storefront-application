import { rmSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { test as setup } from '../fixtures/fixtures'
import type { SignInPage } from '../page-objects/signinPage'
import type { CountryDetector } from '../page-objects/components/countryDetector'
import {
  CHECKOUT_ACCESS_TOKEN_KEY,
  CUSTOMER_ACCOUNT,
  ROUTES,
} from '../support/constants'
import { AUTH_ROLES, authFile, credentialsForRole } from '../support/auth'

/** Sign-in request the SCAYLE auth web component sends; it answers 429 when rate-limited. */
const SIGN_IN_REQUEST = /\/auth\/v3\/login(\?|$)/

/** The Authentication API counts sign-ins per customer in a fixed one-minute window. */
const RATE_LIMIT_WINDOW_MS = 61_000

/** Replaces every occurrence of the password, as typed and as JSON-escaped, in a message. */
function maskPassword(message: string, password: string) {
  // An empty pattern would put the marker between every character.
  if (!password) {
    return message
  }
  return message
    .replaceAll(password, '<password>')
    .replaceAll(JSON.stringify(password).slice(1, -1), '<password>')
}

/**
 * Signs in once through the sign-in page and resolves with the HTTP status of the sign-in
 * request, so the caller can tell a rate limit apart from any other failure.
 */
async function submitSignIn(
  page: Page,
  signinPage: SignInPage,
  countryDetector: CountryDetector,
  email: string,
  password: string,
) {
  await page.goto(ROUTES.signin, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  })
  await countryDetector.closeModal()
  await signinPage.fillLoginData(email, password)

  // Resolves on success and when the sign-in error shows, so the status decides which it was.
  // Both start together, so a failing click cannot leave the response wait rejecting unhandled.
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        SIGN_IN_REQUEST.test(candidate.url()) &&
        candidate.request().method() === 'POST',
      { timeout: 20_000 },
    ),
    signinPage.clickLoginButton(),
  ])
  return response.status()
}

/**
 * Signs in each customer in `AUTH_ROLES` once per browser project and saves the session, so
 * tests that only need a signed-in customer (`test.use(authState(role))`) skip the sign-in UI.
 *
 * Every browser project depends on its own `<browser>-setup` project, so a run limited to one
 * browser (`--project=webkit`) signs in only that browser's customers.
 */
for (const role of AUTH_ROLES) {
  setup(
    `sign in "${role}" customer`,
    async ({ page, signinPage, countryDetector, accountPage }, testInfo) => {
      // Leaves room to wait out one rate-limit window and sign in again.
      setup.setTimeout(RATE_LIMIT_WINDOW_MS + 90_000)

      const browserProject = testInfo.project.metadata.browserProject as string
      const { email, password } = credentialsForRole(browserProject, role)

      // A file from an earlier run must not stand in for this run's session, whether the sign-in
      // fails or the credentials are missing.
      rmSync(authFile(browserProject, role), { force: true })

      // A failed setup project stops every test of its browser project, while a skipped one
      // leaves the guest tests running and fails only the tests that restore this role. The
      // sign-in below skips for the same reason once it has failed for good.
      setup.skip(
        !email || !password,
        `No credentials for the "${role}" customer. Set the TEST_CUSTOMER_* environment variables it reads (see support/auth.ts).`,
      )

      // Set once the sign-in was still rate-limited after waiting out one window, so more
      // attempts would not help.
      let rateLimited = false
      try {
        const signIn = () =>
          submitSignIn(page, signinPage, countryDetector, email, password)
        let status = await signIn()
        if (status === 429) {
          // Other runs, such as a parallel CI job, used up this customer's sign-ins for the minute.
          testInfo.annotations.push({
            type: 'rate-limited',
            description: `${role}: HTTP 429, signing in again after the window resets`,
          })
          await sleep(RATE_LIMIT_WINDOW_MS)
          status = await signIn()
        }
        if (status === 429) {
          rateLimited = true
          throw new Error('HTTP 429 again after waiting one rate-limit window')
        }
        expect(
          status,
          `sign-in request status for the "${role}" customer`,
        ).toBe(200)

        // The account area redirects guests to the sign-in page, so reaching it proves the session.
        await page.goto(CUSTOMER_ACCOUNT.routeOrders, {
          waitUntil: 'domcontentloaded',
          timeout: 20_000,
        })
        await accountPage.accountTabOrders.waitFor({ timeout: 20_000 })

        const state = await page
          .context()
          .storageState({ path: authFile(browserProject, role) })
        expect(
          state.origins.some((origin) =>
            origin.localStorage.some(
              (entry) => entry.name === CHECKOUT_ACCESS_TOKEN_KEY,
            ),
          ),
          'saved state holds the Checkout Web Component access token',
        ).toBe(true)
      } catch (error) {
        // When a test fails, Playwright saves an aria snapshot of the page to `error-context.md` in
        // the CI artifact, and that snapshot lists the typed password. An empty page has none.
        await page.goto('about:blank').catch(() => {})
        // The file is written before the token check, so a failed check must not leave it behind.
        rmSync(authFile(browserProject, role), { force: true })
        // The call log of a failed `fill()` contains the password, in plain and JSON-escaped form,
        // and every reporter prints an error that is rethrown, so mask it before anything else.
        const reason = maskPassword(
          error instanceof Error ? error.message : String(error),
          password,
        )
        // Playwright never retries a skipped test, so a one-off failure (a slow page, the
        // Cloudflare page) only skips once the last attempt has failed. A lasting rate limit skips
        // right away, since more attempts would only use up the customer's sign-ins.
        const lastAttempt = testInfo.retry >= testInfo.project.retries
        if (!rateLimited && !lastAttempt) {
          throw new Error(reason)
        }
        console.error(`Setup for the "${role}" customer failed: ${reason}`)
        setup.skip(
          true,
          `Could not sign in the "${role}" customer, so its saved session is missing: ${reason}`,
        )
      }
    },
  )
}
