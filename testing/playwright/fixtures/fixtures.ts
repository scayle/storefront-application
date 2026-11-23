import process from 'node:process'
import { test as baseTest } from '@playwright/test'
import type { Frame } from '@playwright/test'
import { BasketPage } from '../page-objects/basketPage'
import { WishlistPage } from '../page-objects/wishlistPage'
import { RPC } from '../page-objects/components/rpc'
import { installDeferredReloadTracking } from '../support/deferredReloads'
import { readInertiaPageData } from '../support/inertia'
import { findNonDefaultCountry } from '../support/utils'
import type { NonDefaultCountry } from '../support/utils'
import { createStorefrontAPIClient } from '../support/storefrontAPIClient'
import type { StorefrontAPIClient } from '../support/storefrontAPIClient'
import { getShopIdOverride } from '../support/shopId'
import { generatedPageObjectFixtures } from './pageObjects'
import type { PageObjectFixtures } from './pageObjects'
import { dismissCountryPrompt, scanPage, viewLabel } from '../support/a11y'

interface A11yFixture {
  /**
   * Scans the current page with axe and attaches the result to the test. Does nothing unless
   * `A11Y=1` is set. Call it for a state the crawl can't reach, such as an open modal.
   *
   * @param label - Short name of the scanned state, used in the attachment name.
   */
  checkA11y: (label: string) => Promise<void>
}

interface Fixtures extends PageObjectFixtures {
  a11y: A11yFixture
  /** Turns `a11y.checkA11y` on. Reads `A11Y=1` by default, `test.use({ a11yEnabled: true })` sets it for one spec. */
  a11yEnabled: boolean
  rpc: RPC
  basketPage: BasketPage
  wishlistPage: WishlistPage
  storefrontAPIClient: StorefrontAPIClient
  /** A country of the shop other than the default one. The test skips when the shop has only one. */
  nonDefaultCountry: NonDefaultCountry
  /** The Storefront API client of `nonDefaultCountry`. */
  nonDefaultCountryAPIClient: StorefrontAPIClient
  shopId: number
}

/** Fixtures that live as long as a worker. */
export type WorkerFixtures = {
  /**
   * The non-default country of the shop, looked up once per worker. `undefined` when the shop has
   * only the default country.
   */
  nonDefaultCountryLookup: NonDefaultCountry | undefined
  /** Kinds of page the replay scanned in this worker, as `project|label`. */
  a11yScannedViews: Set<string>
}

export type OutputMode = 'json' | 'html' | 'csv'

// The replay runs after the `afterEach` hooks and adds this much to the test timeout, so a slow
// page can't push a passing test into a timeout.
const A11Y_REPLAY_LIMIT_MS = 15_000

export const test = baseTest.extend<Fixtures, WorkerFixtures>({
  nonDefaultCountryLookup: [
    async ({ playwright }, use, workerInfo) => {
      const { baseURL, ignoreHTTPSErrors, extraHTTPHeaders } =
        workerInfo.project.use
      const request = await playwright.request.newContext({
        baseURL,
        ignoreHTTPSErrors,
        extraHTTPHeaders,
      })
      try {
        await use(await findNonDefaultCountry(request, baseURL))
      } finally {
        await request.dispose()
      }
    },
    { scope: 'worker' },
  ],
  a11yEnabled: [process.env.A11Y === '1', { option: true }],
  a11yScannedViews: [
    async ({}, use) => {
      await use(new Set<string>())
    },
    { scope: 'worker' },
  ],

  // Set on the context, so every page of it is covered, including the page the a11y replay opens.
  context: async ({ context }, use) => {
    // Block Usercentrics loader
    await context.route(
      'https://web.cmp.usercentrics.eu/ui/loader.js',
      (route) => route.abort(),
    )

    // Block Google Tag Manager gtag requests (all paths under /gtag/)
    await context.route(
      /https:\/\/www\.googletagmanager\.com\/gtag\/.*/,
      (route) => route.abort(),
    )

    await use(context)
  },

  a11y: async ({ page, a11yEnabled }, use, testInfo) => {
    await use({
      checkA11y: async (label) => {
        if (!a11yEnabled) {
          return
        }
        await scanPage(page, testInfo, label, { legacyMode: true })
      },
    })
  },

  // Follows the deferred props of every Inertia page from the first navigation on.
  //
  // With `A11Y=1` it also scans every kind of page a test visits, once per project and worker.
  // During the test it only records the URLs, so the test can't notice it. After the test body it
  // opens a fresh page in the same context, which keeps the session, visits each recorded page and
  // scans it. A page that has no state of its own is scanned as the session leaves it, so a dialog
  // or a half-filled form needs `checkA11y`. The sign-in setup projects and specs that scan pages
  // themselves (`test.use({ a11yEnabled: false })`) are skipped. The replay runs after the
  // `afterEach` hooks, so a hook that cleans up the basket or the session changes what it sees.
  // It lives in this override and not in an `auto` fixture, because an `auto` fixture that takes
  // `page` would open a browser page for tests that only use `request`.
  page: async (
    { page, baseURL, a11yEnabled, a11yScannedViews },
    use,
    testInfo,
  ) => {
    await installDeferredReloadTracking(page)

    const isSetupProject =
      testInfo.project.metadata.browserProject !== undefined
    if (!a11yEnabled || isSetupProject) {
      await use(page)
      return
    }

    const recorded = new Map<string, string>()
    const onNavigated = (frame: Frame) => {
      if (frame !== page.mainFrame()) {
        return
      }
      let url: URL
      try {
        url = new URL(frame.url())
      } catch {
        return
      }
      // A `cbd` token opens an order confirmation once, so a second visit would not show it.
      const isOneTime = url.searchParams.has('cbd')
      if (
        !/^https?:$/.test(url.protocol) ||
        (baseURL && url.origin !== new URL(baseURL).origin) ||
        isOneTime
      ) {
        return
      }
      url.hash = ''
      const label = viewLabel(url.toString(), baseURL)
      if (!recorded.has(label)) {
        recorded.set(label, url.toString())
      }
    }
    page.on('framenavigated', onNavigated)
    await use(page)
    page.off('framenavigated', onNavigated)

    if (testInfo.status === 'timedOut') {
      return
    }
    const keyOf = (label: string) => `${testInfo.project.name}|${label}`
    const pending = [...recorded].filter(
      ([label]) => !a11yScannedViews.has(keyOf(label)),
    )
    if (pending.length === 0) {
      return
    }

    const scanned: string[] = []
    const skipped: string[] = []
    // The replay shares the test timeout, so the time it may use is added to it. A timeout of 0
    // means no limit, for example under `--debug`, and stays that way.
    if (testInfo.timeout > 0) {
      testInfo.setTimeout(testInfo.timeout + A11Y_REPLAY_LIMIT_MS)
    }
    const deadline = Date.now() + A11Y_REPLAY_LIMIT_MS
    const replayPage = await page.context().newPage()
    await dismissCountryPrompt(replayPage)
    try {
      for (const [label, url] of pending) {
        const timeLeft = deadline - Date.now()
        if (timeLeft <= 0) {
          skipped.push(`${label} (out of time)`)
          continue
        }
        a11yScannedViews.add(keyOf(label))
        const replay = async () => {
          const response = await replayPage
            .goto(url, { waitUntil: 'load' })
            .catch(() => null)
          // A redirect, for example to the sign-in page after a sign-out, shows another page.
          if (
            !response ||
            response.status() >= 400 ||
            viewLabel(replayPage.url(), baseURL) !== label
          ) {
            return undefined
          }
          return scanPage(replayPage, testInfo, label, { settle: true })
        }
        const scannedUrl = await Promise.race([
          replay().catch(() => undefined),
          new Promise<undefined>((resolve) => setTimeout(resolve, timeLeft)),
        ])
        if (scannedUrl) {
          scanned.push(label)
        } else {
          a11yScannedViews.delete(keyOf(label))
          skipped.push(label)
        }
      }
    } finally {
      await replayPage.close().catch(() => undefined)
    }
    testInfo.annotations.push({
      type: 'a11y-replay',
      description: `Scanned ${scanned.length}: ${scanned.join(', ') || 'none'}${
        skipped.length > 0
          ? `. Skipped ${skipped.length}: ${skipped.join(', ')}`
          : ''
      }`,
    })
  },

  shopId: async ({ page, baseURL }, use) => {
    if (!baseURL) {
      throw new Error('baseURL is not configured.')
    }
    await page.goto(baseURL, { waitUntil: 'networkidle' })
    const shopIdOverride = getShopIdOverride()
    if (shopIdOverride !== undefined) {
      await use(shopIdOverride)
      return
    }
    const pageData = await readInertiaPageData<{
      props?: { storefront?: { country?: { shopCountryId?: number } } }
    }>(page)
    const shopCountryId = pageData?.props?.storefront?.country?.shopCountryId
    if (typeof shopCountryId !== 'number') {
      throw new Error(
        'Could not resolve shop ID from the Inertia [data-page] payload. ' +
          'Set E2E_SHOP_ID (e.g. shop country ID) when running against a custom app.',
      )
    }
    await use(shopCountryId)
  },

  storefrontAPIClient: async ({ shopId }, use) => {
    await use(createStorefrontAPIClient(shopId))
  },

  nonDefaultCountry: async ({ nonDefaultCountryLookup }, use) => {
    baseTest.skip(
      !nonDefaultCountryLookup,
      'The shop has only the default country, so there is no non-default country to search in - skipping test',
    )
    await use(nonDefaultCountryLookup as NonDefaultCountry)
  },

  nonDefaultCountryAPIClient: async ({ nonDefaultCountry }, use) => {
    await use(createStorefrontAPIClient(nonDefaultCountry.shopId))
  },

  rpc: async ({ page }, use) => {
    await use(new RPC(page, getShopIdOverride()))
  },

  basketPage: async ({ page, rpc }, use) => {
    await use(new BasketPage(page, rpc))
  },
  wishlistPage: async ({ page, rpc }, use) => {
    await use(new WishlistPage(page, rpc))
  },

  // Simple, `page`-only fixtures generated from `pageObjectMap` in `pageObjects.ts`.
  ...generatedPageObjectFixtures,
})
