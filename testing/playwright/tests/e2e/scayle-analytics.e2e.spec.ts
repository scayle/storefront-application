import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { Variant } from '@scayle/storefront-api'
import consentVendorConfig from '../../../../src/client/consent-vendor.config.json' with { type: 'json' }
import { test } from '../../fixtures/fixtures'
import type { BasketPage } from '../../page-objects/basketPage'
import { ROUTES } from '../../support/constants'
import { isVariantBuyableNow } from '../../support/productTestHelpers'
import type { StorefrontAPIClient } from '../../support/storefrontAPIClient'
import {
  executeSearch,
  getCustomerForBrowser,
  getHomepageUrl,
  isMobile,
  navigateToPlp,
} from '../../support/utils'

/**
 * @file Smoke tests for the SCAYLE Analytics pipeline against a production
 * build: with consent granted, the dispatcher posts one
 * `POST /api/analytics/events` per event. The first test proves the wiring
 * (dispatcher, consent gate, same-origin route); the others pin the event
 * shapes the local QA pass found wrong: no plugin error on a hard load, page
 * views on browser history, one promotion impression per page view, filter
 * option counts, the 404 page, one session across login and logout, capped
 * basket quantities, basket surfaces, no search resubmit on back navigation,
 * the PDP wishlist surface, a first visit whose `customer-data` request is
 * held, the session expiry in an open tab, the add-to-basket confirmation's
 * recommendations, and a size change on the basket page. Per-event coverage
 * lives in the unit tests.
 *
 * The server does not forward events to the Storefront API under `vite dev`, but
 * the dispatcher still posts to the same-origin analytics route, which is what
 * these tests assert.
 */

const ANALYTICS_EVENTS_PATH = '/api/analytics/events'

/** Stand-in for the Usercentrics controller id the CMP would issue. */
const CONSENT_ID = 'e2e-consent-id'

// The fixtures block the Usercentrics loader, so consent is granted by
// replaying the CMP's `UC_CONSENT` event for the vendor the dispatcher gates
// on. The vendor id comes from the application's config so the test follows a
// renamed or replaced id.
const SCAYLE_ANALYTICS_VENDOR_ID = consentVendorConfig['scayle-analytics']

/** One event body the dispatcher posted, as the analytics route receives it. */
type AnalyticsEvent = Record<string, unknown> & {
  event_name: string
  page_type?: string
  page_path?: string
  previous_page_path?: string
  previous_page_type?: string
  session_id?: string
}

/** Key of the SCAYLE Analytics session the dispatcher keeps in `localStorage`. */
const SESSION_STORAGE_KEY = 'scayle-analytics-session'

const storedSession = (page: Page) =>
  page.evaluate(
    (key) =>
      JSON.parse(localStorage.getItem(key) ?? 'null') as {
        id: string
        lastEventAt: number
        /** The attribution the session started with. */
        start?: Record<string, unknown>
      } | null,
    SESSION_STORAGE_KEY,
  )

/**
 * The attribution of the session that the login and logout test starts with. The landing URL and
 * the external referrer it sends yield these two values, which the page views, the GA4 contexts
 * and the stored session start must all carry.
 */
const LANDING_ATTRIBUTION = {
  utm_source: 'e2e',
  referrer: 'https://www.google.com/search',
}

const grantConsent = (page: Page, given = true) =>
  page.evaluate(
    ({ vendorId, consentId, given }) => {
      window.dispatchEvent(
        new CustomEvent('UC_CONSENT', {
          detail: {
            services: { [vendorId]: { consent: { given } } },
            consent: { controllerId: consentId },
          },
        }),
      )
    },
    { vendorId: SCAYLE_ANALYTICS_VENDOR_ID, consentId: CONSENT_ID, given },
  )

/**
 * Grants consent on every page load before the first event fires. The
 * synthetic `UC_CONSENT` event is not persisted like the real CMP's consent,
 * and the consent listener only exists once the app has mounted, so the init
 * script replays the event until the GA4 plugin has pushed its first
 * `page_view`, which waits for the deferred `customer` prop and so
 * comes after the initial `view_page`. A 20 second cap covers a page that never
 * gets there. Repeating the event is harmless: the adapter writes the same
 * state.
 */
const armConsent = (page: Page) =>
  page.addInitScript(
    ({ vendorId, consentId }) => {
      const grant = () =>
        window.dispatchEvent(
          new CustomEvent('UC_CONSENT', {
            detail: {
              services: { [vendorId]: { consent: { given: true } } },
              consent: { controllerId: consentId },
            },
          }),
        )
      const hasPageView = () =>
        (
          window as unknown as { dataLayer?: { event?: string }[] }
        ).dataLayer?.some((entry) => entry.event === 'page_view') ?? false
      const timer = setInterval(() => {
        grant()
        if (hasPageView()) {
          clearInterval(timer)
        }
      }, 100)
      setTimeout(() => clearInterval(timer), 20000)
    },
    { vendorId: SCAYLE_ANALYTICS_VENDOR_ID, consentId: CONSENT_ID },
  )

/** Name of the page-side function that hands a beacon body to the test. */
const RECORD_ANALYTICS_EVENT = '__recordAnalyticsEvent'

// Wraps `navigator.sendBeacon` so every body the browser accepted for the
// analytics route reaches the test through the exposed function. A refused
// beacon is not recorded: the dispatcher resends it, and recording both would
// count the event twice. Runs in the page, so it must not close over test
// scope. A promise chain keeps the events in send order, since `Blob.text()`
// is asynchronous.
const recordBeacons = ({ path, record }: { path: string; record: string }) => {
  const sendBeacon = navigator.sendBeacon.bind(navigator)
  const handOff = (
    window as unknown as Record<string, (event: unknown) => void>
  )[record]!
  let pending: Promise<unknown> = Promise.resolve()
  navigator.sendBeacon = (url, body) => {
    const accepted = sendBeacon(url, body)
    if (accepted && String(url).includes(path) && body instanceof Blob) {
      pending = pending
        .then(() => body.text())
        .then((text) => handOff(JSON.parse(text)))
    }
    return accepted
  }
}

/**
 * Collects every event the dispatcher posts and answers the route locally, so
 * the smoke run neither depends on nor writes to the Storefront API ingest.
 *
 * The body is read in the page as `sendBeacon` accepts it: WebKit hands
 * Playwright no body for an intercepted beacon (`request.postData()` is
 * null), where Chromium exposes it. The recorder is installed on the current
 * document and on every one the page loads after this call. The route handler
 * counts the requests that reach it, since the recorder alone cannot tell a
 * beacon the CSP blocked from one that went out.
 */
const collectAnalyticsEvents = async (page: Page) => {
  const events: AnalyticsEvent[] = []
  const requests = { count: 0 }
  const recorder = {
    path: ANALYTICS_EVENTS_PATH,
    record: RECORD_ANALYTICS_EVENT,
  }
  await page.exposeFunction(RECORD_ANALYTICS_EVENT, (event: AnalyticsEvent) => {
    events.push(event)
  })
  await page.addInitScript(recordBeacons, recorder)
  await page.evaluate(recordBeacons, recorder)
  await page.route(`**${ANALYTICS_EVENTS_PATH}`, (route) => {
    requests.count += 1
    return route.fulfill({ status: 202 })
  })
  return Object.assign(events, { requests })
}

const eventsNamed = (events: AnalyticsEvent[], name: string) =>
  events.filter((event) => event.event_name === name)

/** Waits until `count` events of the given name were posted. */
const expectEventCount = (
  events: AnalyticsEvent[],
  name: string,
  count: number,
) =>
  expect
    .poll(() => eventsNamed(events, name).length, { timeout: 15000 })
    .toBe(count)

/** A fixed pause, for "no more than" assertions that have nothing to wait on. */
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Gives late events time to arrive before a "no more than" assertion. */
const settle = (page: Page) =>
  page.waitForLoadState('networkidle').then(() => pause(1500))

/**
 * Puts one unit of a variant into the session's basket through the RPC and
 * returns it. `stock` is the minimum quantity the variant needs; with `exact`
 * the quantity has to match, for a test that relies on the Storefront API
 * capping the next add. Variants sellable without stock are never capped, so
 * they are excluded. The catalog stock lags the basket, so a candidate the
 * basket rejects as out of stock is skipped.
 */
const addOneUnitOfAVariantWithStock = async (
  { stock, exact = false }: { stock: number; exact?: boolean },
  storefrontAPIClient: StorefrontAPIClient,
  basketPage: BasketPage,
) => {
  const tried = new Set<number>()
  const hasStock = (variant: Variant) =>
    variant.stock.isSellableWithoutStock !== true &&
    (exact ? variant.stock.quantity === stock : variant.stock.quantity >= stock)
  for (let attempt = 0; attempt < 5; attempt++) {
    const product = await storefrontAPIClient.findProduct(
      (candidate) =>
        candidate.isActive &&
        !tried.has(candidate.id) &&
        (candidate.variants?.some(hasStock) ?? false),
    )
    if (!product) {
      break
    }
    tried.add(product.id)
    const variant = product.variants!.find(hasStock)!
    try {
      await basketPage.addProductToBasket(variant.id, 1)
      return { product, variant }
    } catch (error) {
      if (!/out of stock/i.test(String(error))) {
        throw error
      }
    }
  }
  return { product: undefined, variant: undefined }
}

test.describe('SCAYLE Analytics dispatcher', () => {
  test.beforeEach(async ({ homePage, countryDetector, page }) => {
    await homePage.navigate(page, ROUTES.home, 'networkidle')
    await page.waitForLoadState('domcontentloaded')
    await countryDetector.closeModal()
  })

  test('Granting consent and navigating posts a view_page event to the analytics route', async ({
    header,
    page,
  }) => {
    await test.step('Grant consent for the SCAYLE Analytics vendor', async () => {
      // Nothing is stored before consent.
      expect(await storedSession(page)).toBeNull()
      await grantConsent(page)
    })

    await test.step('An Inertia navigation posts one view_page event', async () => {
      // The wishlist link is visible on every viewport and triggers a regular
      // Inertia visit, the same navigation the route announcer test relies on.
      const events = await collectAnalyticsEvents(page)
      await header.wishlistLink.click()

      const wishlistView = () =>
        eventsNamed(events, 'view_page').find(
          (event) => event.page_type === 'wishlist',
        )
      await expect.poll(wishlistView, { timeout: 15000 }).toBeDefined()
      const viewPage = wishlistView()
      expect(viewPage).toMatchObject({
        event_name: 'view_page',
        consent_id: CONSENT_ID,
        page_type: 'wishlist',
        page_path: expect.stringContaining('/wishlist'),
      })
      expect((await storedSession(page))?.id).toBe(viewPage?.session_id)
      // The recorder reads the body before the request leaves the page, so
      // only the route handler proves the beacon reached the same-origin
      // route past the CSP.
      await expect
        .poll(() => events.requests.count, { timeout: 15000 })
        .toBeGreaterThanOrEqual(1)
    })

    await test.step('Withdrawing consent removes the stored session', async () => {
      await grantConsent(page, false)
      await expect.poll(() => storedSession(page)).toBeNull()
    })
  })
})

test.describe('SCAYLE Analytics event shapes', () => {
  test('A hard load raises no error from the tracking plugins', async ({
    homePage,
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text())
      }
    })

    await homePage.navigate(page, ROUTES.home, 'networkidle')
    await pause(1000)

    // Failed resource loads (blocked CMP, GTM) are not plugin errors.
    expect(errors.filter((text) => /TypeError/.test(text))).toEqual([])
  })

  test('Browser back and forward each post one view_page with the previous page', async ({
    homePage,
    countryDetector,
    header,
    page,
  }) => {
    await armConsent(page)
    const events = await collectAnalyticsEvents(page)

    await homePage.navigate(page, ROUTES.home, 'networkidle')
    await countryDetector.closeModal()
    await expectEventCount(events, 'view_page', 1)

    await header.wishlistLink.click()
    await page.waitForURL(/\/wishlist/)
    await expectEventCount(events, 'view_page', 2)

    await page.goBack()
    await page.waitForURL(
      (url) => !url.pathname.includes(`/${ROUTES.wishlist}`),
    )
    await expectEventCount(events, 'view_page', 3)

    await page.goForward()
    await page.waitForURL(/\/wishlist/)
    await expectEventCount(events, 'view_page', 4)
    await settle(page)

    const views = eventsNamed(events, 'view_page')
    expect(views).toHaveLength(4)
    expect(views[2]).toMatchObject({
      page_type: 'homepage',
      previous_page_type: 'wishlist',
      previous_page_path: expect.stringContaining('/wishlist'),
    })
    expect(views[3]).toMatchObject({
      page_type: 'wishlist',
      previous_page_type: 'homepage',
      previous_page_path: views[2]!.page_path,
    })

    // GA4 follows the same navigations.
    const ga4PageViews = await page.evaluate(
      () =>
        (
          window as unknown as { dataLayer?: { event?: string }[] }
        ).dataLayer?.filter((entry) => entry.event === 'page_view').length,
    )
    expect(ga4PageViews).toBe(4)
  })

  test('The layout ribbon posts one view_promotion per page view, not per deferred prop load', async ({
    homePage,
    countryDetector,
    promotions,
    mobileNavigation,
    mainNavigation,
    storefrontAPIClient,
    page,
  }) => {
    await armConsent(page)
    const events = await collectAnalyticsEvents(page)

    await homePage.navigate(page, ROUTES.home, 'networkidle')
    await countryDetector.closeModal()
    await expectEventCount(events, 'view_page', 1)

    // The ribbon's first impression on a hard load fires before consent lands
    // and is dropped by design, so the assertion runs on the next page view:
    // a listing page, long enough to scroll the persistent ribbon out and back
    // into view, which is what re-reports an impression after the path change.
    // The side navigation links on mobile sit off screen while it is closed, so a
    // direct click on the first `nav` link fails.
    await navigateToPlp(
      page,
      mobileNavigation,
      mainNavigation,
      storefrontAPIClient,
    )
    await page.waitForURL(/\/c\//)
    await expectEventCount(events, 'view_page', 2)
    // The precondition is the ribbon itself, not its event: a ribbon that
    // renders and reports nothing after the path change is the regression this
    // test exists for, and must fail rather than skip.
    await promotions.promotionRibbon
      .first()
      .waitFor({ timeout: 10000 })
      .catch(() => undefined)
    test.skip(
      (await promotions.promotionRibbon.count()) === 0,
      'No promotion or campaign ribbon on this shop',
    )
    const impressionsBefore = eventsNamed(events, 'view_promotion').length

    await page.mouse.wheel(0, 3000)
    await pause(500)
    await page.mouse.wheel(0, -3000)
    await settle(page)
    // Deferred prop groups have landed by now; scroll once more to prove the
    // guard stays spent.
    await page.mouse.wheel(0, 3000)
    await pause(500)
    await page.mouse.wheel(0, -3000)
    await settle(page)

    const ribbonImpressions = eventsNamed(events, 'view_promotion')
      .slice(impressionsBefore)
      .filter((event) => event.component_type === 'ribbon')
    expect(
      ribbonImpressions,
      `Ribbon impressions after the path change, events seen: ${events
        .map((event) => event.event_name)
        .join(', ')}`,
    ).toHaveLength(1)
  })

  test('apply_filter counts the applied options, not the filter groups', async ({
    productListingPage,
    countryDetector,
    filters,
    storefrontAPIClient,
    page,
  }) => {
    // Ten products, the same bar the listing filter test uses, so the color
    // filter has options.
    const category = await storefrontAPIClient.findCategoryWithProducts(10)
    test.skip(!category, 'No category with ten products found')

    await armConsent(page)
    const events = await collectAnalyticsEvents(page)
    await productListingPage.navigate(
      page,
      storefrontAPIClient.getCategoryPath(category!),
      'networkidle',
    )
    await countryDetector.closeModal()

    await filters.buttonOpenFilters.click()
    // The filter options arrive as a deferred prop after the slide-in opens.
    await filters.filterColorChip
      .first()
      .waitFor({ timeout: 10000 })
      .catch(() => undefined)
    const chipCount = await filters.filterColorChip.count()
    test.skip(
      chipCount < 2,
      `Fewer than two color options to apply on ${page.url()} (${chipCount} chips)`,
    )

    await filters.filterColorChip.nth(0).setChecked(true)
    await expectEventCount(events, 'apply_filter', 1)
    await filters.filterColorChip.nth(1).setChecked(true)
    await expectEventCount(events, 'apply_filter', 2)

    const [first, second] = eventsNamed(events, 'apply_filter')
    expect(first).toMatchObject({
      filter_slug: 'color',
      filter_action: 'add',
      active_filters: 1,
    })
    // Two colors are one filter group but two applied options.
    expect(second).toMatchObject({
      filter_slug: 'color',
      filter_action: 'add',
      active_filters: 2,
    })
  })

  test('An unknown URL posts a view_page with page_type not_found and the next page refers back to it', async ({
    countryDetector,
    header,
    page,
  }) => {
    await armConsent(page)
    const events = await collectAnalyticsEvents(page)

    const response = await page.goto('c/does-not-exist-999999', {
      waitUntil: 'networkidle',
    })
    expect(response?.status()).toBe(404)
    await countryDetector.closeModal()
    await expectEventCount(events, 'view_page', 1)
    expect(eventsNamed(events, 'view_page')[0]).toMatchObject({
      page_type: 'not_found',
      page_path: expect.stringContaining('/c/does-not-exist-999999'),
    })

    await header.wishlistLink.click()
    await page.waitForURL(/\/wishlist/)
    await expectEventCount(events, 'view_page', 2)
    expect(eventsNamed(events, 'view_page')[1]).toMatchObject({
      page_type: 'wishlist',
      previous_page_type: 'not_found',
      previous_page_path: expect.stringContaining('/c/does-not-exist-999999'),
    })
  })

  test('A login and a logout keep the session id and its attribution', async ({
    homePage,
    countryDetector,
    header,
    signinPage,
    page,
    baseURL,
  }, testInfo) => {
    // The user flyout with the logout button is desktop-only.
    test.skip(isMobile(page), 'Test only for desktop browsers')
    const { email, password } = getCustomerForBrowser(testInfo.project.name)
    test.skip(
      !email || !password,
      'The test customer email and TEST_CUSTOMER_PASSWORD for this project are not set',
    )
    await armConsent(page)
    const events = await collectAnalyticsEvents(page)
    const readGa4Contexts = () =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              dataLayer?: {
                event?: string
                context?: Record<string, unknown>
              }[]
            }
          ).dataLayer
            ?.filter((entry) => entry.event === 'page_view')
            .map((entry) => entry.context) ?? [],
      )

    // An external referrer, so the session start has one to keep. The
    // credential keys and the fragment of both URLs must not get further than
    // the browser. The homepage URL has no trailing slash, since the redirect
    // for one would cut the referrer to its origin.
    await page.goto(
      `${getHomepageUrl(baseURL)}?hash=e2e-secret&utm_source=e2e#access_token=e2e-token`,
      {
        waitUntil: 'networkidle',
        referer:
          'https://www.google.com/search?q=boots&token=e2e-secret&utm_medium=cpc',
      },
    )
    await countryDetector.closeModal()
    await expectEventCount(events, 'view_page', 1)

    let ga4ContextsBeforeHome: Awaited<ReturnType<typeof readGa4Contexts>> = []

    await test.step('Log in', async () => {
      await header.headerLoginButton.first().hover()
      await header.userFlyoutLoginLink.click()
      await page.waitForURL(/\/signin/)
      await expectEventCount(events, 'view_page', 2)

      await signinPage.fillLoginData(email, password)
      await signinPage.clickLoginButton()
      await signinPage.waitForRedirectAfterLogin({ timeout: 15_000 })
      // The post-login redirect is a `replace` visit and still counts.
      await expectEventCount(events, 'view_page', 3)
    })

    await test.step('Log out', async () => {
      // Logout reloads the current page, which produces no page view by design.
      // Log out on the wishlist and go home afterwards, so the logged-out visit
      // is still counted.
      await header.wishlistLink.click()
      await page.waitForURL(/\/wishlist/)
      await expectEventCount(events, 'view_page', 4)

      await expect(async () => {
        await header.headerLoginButton.first().hover()
        await expect(header.userFlyoutLogoutButton).toBeVisible({
          timeout: 8000,
        })
      }).toPass({ timeout: 25000 })
      await header.userFlyoutLogoutButton.click()
      await header.userFlyoutLoginLink.waitFor({ state: 'visible' })
      await expect(page).toHaveURL(/\/wishlist/)
      // The flyout shows the logged-out state before the reload has finished,
      // and a visit started now would cancel it.
      await header.waitForDeferredReloads()

      // A document load resets the dataLayer, so the GA4 page views of the
      // earlier pages are read first, once all four have arrived.
      await expect
        .poll(async () => (await readGa4Contexts()).length, { timeout: 15000 })
        .toBe(4)
      ga4ContextsBeforeHome = await readGa4Contexts()
      await homePage.navigate(page, ROUTES.home)
      await expectEventCount(events, 'view_page', 5)
    })

    // Anonymous, logged in and logged out: one session, one attribution.
    const pageViews = eventsNamed(events, 'view_page')
    expect(pageViews[0]!.session_id).toBeTruthy()
    for (const pageView of pageViews) {
      expect(pageView).toMatchObject({
        session_id: pageViews[0]!.session_id,
        ...LANDING_ATTRIBUTION,
      })
    }

    // GA4 pushes its page_view after the SCAYLE Analytics one.
    await expect
      .poll(async () => (await readGa4Contexts()).length, { timeout: 15000 })
      .toBe(1)
    const ga4Contexts = [...ga4ContextsBeforeHome, ...(await readGa4Contexts())]

    // GA4 reads the same session: every page_view carries its id and landing
    // attribution, and `user_id` only while logged in.
    for (const context of ga4Contexts) {
      expect(context).toMatchObject({
        session_id: pageViews[0]!.session_id,
        landing_page_path: pageViews[0]!.landing_page_path,
        ...LANDING_ATTRIBUTION,
      })
      expect(context!.user_id).toEqual(
        context!.login_state === 'logged_in' ? expect.any(String) : undefined,
      )
    }
    // The credential key, the fragment and the referrer's query reached
    // neither the dataLayer nor the stored session nor a SCAYLE Analytics
    // request.
    const dataLayer = await page.evaluate(
      () => (window as unknown as { dataLayer?: unknown[] }).dataLayer,
    )
    const session = await storedSession(page)
    const browserState = JSON.stringify([dataLayer, session])
    for (const credential of ['e2e-secret', 'e2e-token']) {
      expect(browserState).not.toContain(credential)
      expect(JSON.stringify(events)).not.toContain(credential)
    }
    // The attribution survives as fields of the stored session start. The
    // dataLayer is reset by the document load of the last visit, and the
    // landing query string itself is not stored. The stored id is the one
    // every page view carried, so no new session replaced it.
    expect(session?.id).toBe(pageViews[0]!.session_id)
    expect(session?.start).toMatchObject(LANDING_ATTRIBUTION)

    // Home, sign-in, the post-login redirect, wishlist, home after logout.
    expect(ga4Contexts.map((context) => context!.login_state)).toEqual([
      'logged_out',
      'logged_out',
      'logged_in',
      'logged_in',
      'logged_out',
    ])
  })

  test('add_to_basket reports the units the basket gained when the Storefront API caps the add', async ({
    homePage,
    productDetailPage,
    basketPage,
    countryDetector,
    storefrontAPIClient,
    page,
  }) => {
    await armConsent(page)
    const events = await collectAnalyticsEvents(page)
    await homePage.navigate(page, ROUTES.home, 'networkidle')
    await countryDetector.closeModal()

    // A variant with exactly two units: one goes in first, so the PDP add of
    // two can only land one. The catalog stock lags the basket, so a candidate
    // the basket rejects is skipped for the next one.
    const { product, variant } = await addOneUnitOfAVariantWithStock(
      { stock: 2, exact: true },
      storefrontAPIClient,
      basketPage,
    )
    test.skip(!product || !variant, 'No addable variant with a stock of two')

    // The client basket is a once-prop: a hard load picks up the unit added
    // outside the page, the way a returning visitor's PDP would.
    await productDetailPage.navigate(page, `p/p-${product!.id}`, 'networkidle')
    await countryDetector.closeModal()

    const combobox = productDetailPage.variantPicker.getByRole('combobox')
    if ((await combobox.count()) > 0) {
      await expect(() => productDetailPage.openVariantPicker()).toPass({
        timeout: 10000,
      })
    }
    await productDetailPage.clickVariantOption(String(variant!.id))
    await productDetailPage.clickQuantityPlus()
    await expect(productDetailPage.quantityValue).toHaveText('2')
    await productDetailPage.addProductToBasket()

    await expectEventCount(events, 'add_to_basket', 1)
    expect(eventsNamed(events, 'add_to_basket')[0]).toMatchObject({
      variant_id: String(variant!.id),
      quantity: 1,
      product_list_type: null,
      product_list_id: null,
    })
  })

  test('Quantity changes on the basket page report the basket surface', async ({
    homePage,
    basketPage,
    countryDetector,
    header,
    storefrontAPIClient,
    page,
  }) => {
    await armConsent(page)
    const events = await collectAnalyticsEvents(page)
    await homePage.navigate(page, ROUTES.home, 'networkidle')
    await countryDetector.closeModal()

    const { variant } = await addOneUnitOfAVariantWithStock(
      { stock: 3 },
      storefrontAPIClient,
      basketPage,
    )
    test.skip(!variant, 'No addable variant with three units in stock')

    // The client basket is a once-prop, so the unit added outside the page
    // needs a hard load to show up.
    await homePage.navigate(page, ROUTES.home, 'networkidle')
    await countryDetector.closeModal()
    await header.visitBasketPage()
    await basketPage.basketProductCard.first().waitFor()

    await basketPage.buttonQuantityIncrease.click()
    await expectEventCount(events, 'add_to_basket', 1)
    expect(eventsNamed(events, 'add_to_basket')[0]).toMatchObject({
      variant_id: String(variant!.id),
      quantity: 1,
      product_list_type: 'basket',
      product_list_id: null,
    })

    await basketPage.removeItemFromBasket()
    await expectEventCount(events, 'remove_from_basket', 1)
    expect(eventsNamed(events, 'remove_from_basket')[0]).toMatchObject({
      variant_id: String(variant!.id),
      quantity: 2,
      product_list_type: 'basket',
      product_list_id: null,
    })
  })

  test('A size change on the basket page reports the old line removed and the new variant added', async ({
    homePage,
    basketPage,
    countryDetector,
    header,
    storefrontAPIClient,
    page,
  }) => {
    await armConsent(page)
    const events = await collectAnalyticsEvents(page)
    await homePage.navigate(page, ROUTES.home, 'networkidle')
    await countryDetector.closeModal()

    const product = await storefrontAPIClient.findProduct(
      (candidate) =>
        candidate.isActive &&
        (candidate.variants?.filter(isVariantBuyableNow).length ?? 0) >= 2,
    )
    test.skip(!product, 'No active product with two buyable sizes found')
    const [from, to] = product!.variants!.filter(isVariantBuyableNow)
    try {
      await basketPage.addProductToBasket(from!.id, 1)
    } catch (error) {
      // The catalog stock lags the basket, so the add can still be refused.
      test.skip(
        /out of stock/i.test(String(error)),
        `Variant ${from!.id} is out of stock`,
      )
      throw error
    }

    // The client basket is a once-prop, so the unit added outside the page
    // needs a hard load to show up.
    await homePage.navigate(page, ROUTES.home, 'networkidle')
    await countryDetector.closeModal()
    await header.visitBasketPage()
    await basketPage.basketProductCard.first().waitFor()

    await basketPage.chooseVariant(to!.id)

    await expectEventCount(events, 'remove_from_basket', 1)
    await expectEventCount(events, 'add_to_basket', 1)
    const [removed] = eventsNamed(events, 'remove_from_basket')
    const [addedEvent] = eventsNamed(events, 'add_to_basket')
    expect(removed).toMatchObject({
      product_id: String(product!.id),
      variant_id: String(from!.id),
      quantity: 1,
      product_list_type: 'basket',
      product_list_id: null,
    })
    expect(addedEvent).toMatchObject({
      product_id: String(product!.id),
      variant_id: String(to!.id),
      quantity: 1,
      product_list_type: 'basket',
      product_list_id: null,
    })
    expect(events.indexOf(removed!)).toBeLessThan(events.indexOf(addedEvent!))
  })

  test('The add-to-basket confirmation reports its recommendations as the trending slider', async ({
    homePage,
    productDetailPage,
    addToBasketSlideIn,
    countryDetector,
    storefrontAPIClient,
    page,
  }) => {
    await armConsent(page)
    const events = await collectAnalyticsEvents(page)
    await homePage.navigate(page, ROUTES.home, 'networkidle')
    await countryDetector.closeModal()

    const product = await storefrontAPIClient.findProduct(
      (candidate) =>
        candidate.isActive &&
        (candidate.variants?.some(isVariantBuyableNow) ?? false),
    )
    test.skip(!product, 'No active product with a buyable variant found')

    await productDetailPage.navigate(page, `p/p-${product!.id}`, 'networkidle')
    await countryDetector.closeModal()
    await productDetailPage.chooseProductVariant()

    // The PDP's own trending slider reports the same surface once it scrolls
    // into view, so the confirmation's list is counted from the add on.
    const trending = (name: string) =>
      eventsNamed(events, name).filter(
        (event) =>
          event.product_list_type === 'product_slider' &&
          event.product_list_id === 'trending',
      )
    const listsBefore = trending('view_product_list').length
    const tilesBefore = trending('view_product_tile').length

    await productDetailPage.addProductToBasket({ dismissSlideIn: false })
    await addToBasketSlideIn.assertIsVisible()
    // The recommendations are the deferred `trendingProducts` prop.
    await addToBasketSlideIn.recommendationCards
      .first()
      .waitFor({ timeout: 10000 })
      .catch(() => undefined)
    const cardCount = await addToBasketSlideIn.recommendationCards.count()
    test.skip(
      cardCount === 0,
      'The product detail page sends no trending products',
    )

    await expect
      .poll(() => trending('view_product_list').length, { timeout: 15000 })
      .toBe(listsBefore + 1)
    const lists = trending('view_product_list')
    expect(lists[lists.length - 1]).toMatchObject({ total: cardCount })
    // A tile counts once half of the card is visible. On a narrow viewport the
    // confirmation shows its summary first and the cards start below the fold.
    await addToBasketSlideIn.recommendationCards
      .first()
      .scrollIntoViewIfNeeded()
    await expect
      .poll(() => trending('view_product_tile').length, { timeout: 15000 })
      .toBeGreaterThan(tilesBefore)
    const tiles = trending('view_product_tile')
    expect(tiles[tiles.length - 1]).toMatchObject({
      total: cardCount,
      position: expect.any(Number),
    })
    await addToBasketSlideIn.recommendationCards.first().click()

    await expectEventCount(events, 'select_product', 1)
    expect(eventsNamed(events, 'select_product')[0]).toMatchObject({
      product_list_type: 'product_slider',
      product_list_id: 'trending',
    })
  })

  test('Returning to the search results via browser back does not resubmit the search', async ({
    homePage,
    productListingPage,
    countryDetector,
    mobileNavigation,
    search,
    storefrontAPIClient,
    page,
  }) => {
    const term = await storefrontAPIClient.findSearchTermThatOpensResultsPage()
    test.skip(!term, 'No search term opens the results page')

    await armConsent(page)
    const events = await collectAnalyticsEvents(page)
    await homePage.navigate(page, ROUTES.home, 'networkidle')
    await countryDetector.closeModal()
    await expectEventCount(events, 'view_page', 1)

    // Submitted through the header, the way a user reaches the results page.
    await executeSearch(page, mobileNavigation, search, term!, 'enter')
    await page.waitForURL(/\/search/)
    await expectEventCount(events, 'search', 1)
    expect(eventsNamed(events, 'search')[0]).toMatchObject({
      search_term: term,
      search_destination_type: 'term',
    })

    const card = productListingPage.productCard.first()
    test.skip((await card.count()) === 0, `No results for "${term}"`)
    await card.locator('a').first().click()
    await page.waitForURL(/\/p\//)
    await expectEventCount(events, 'view_page', 3)

    await page.goBack()
    await page.waitForURL(/\/search/)
    await expectEventCount(events, 'view_page', 4)
    await settle(page)

    expect(eventsNamed(events, 'search')).toHaveLength(1)
  })

  test('add_to_wishlist from the PDP sends product_list_id null next to the null surface', async ({
    productDetailPage,
    countryDetector,
    storefrontAPIClient,
    page,
  }) => {
    const product = await storefrontAPIClient.findProduct(
      (candidate) => candidate.isActive,
    )
    test.skip(!product, 'No active product found')

    await armConsent(page)
    const events = await collectAnalyticsEvents(page)
    await productDetailPage.navigate(page, `p/p-${product!.id}`, 'networkidle')
    await countryDetector.closeModal()

    await productDetailPage.buttonAddToWishlistDesktop.dispatchEvent('click')
    await expectEventCount(events, 'add_to_wishlist', 1)

    const event = eventsNamed(events, 'add_to_wishlist')[0]!
    expect(event).toMatchObject({
      product_id: String(product!.id),
      product_list_type: null,
    })
    expect(event).toHaveProperty('product_list_id', null)
  })

  test('A first visit posts view_page while the customer request is held, and a reload keeps the session', async ({
    homePage,
    page,
  }) => {
    await armConsent(page)
    const events = await collectAnalyticsEvents(page)
    // The deferred `customer` reload is what the GA4 plugin waits for and
    // SCAYLE Analytics must not. Held until the first `view_page` is in.
    let held = false
    let releaseCustomerData = () => {}
    const customerDataHeld = new Promise<void>((resolve) => {
      releaseCustomerData = resolve
    })
    await page.route('**/*', async (route) => {
      const partialData = route.request().headers()['x-inertia-partial-data']
      if (partialData?.split(',').includes('customer')) {
        held = true
        await customerDataHeld
      }
      await route.fallback()
    })

    // Not `networkidle`: the held request keeps the network busy.
    await homePage.navigate(page, ROUTES.home, 'domcontentloaded')
    await expect.poll(() => held).toBe(true)
    await expectEventCount(events, 'view_page', 1)
    releaseCustomerData()

    const sessionId = eventsNamed(events, 'view_page')[0]!.session_id
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/)
    expect((await storedSession(page))?.id).toBe(sessionId)

    await page.reload()
    await expectEventCount(events, 'view_page', 2)
    expect(eventsNamed(events, 'view_page')[1]!.session_id).toBe(sessionId)
  })

  test('An event an hour after the last one starts a clean session in the open tab', async ({
    homePage,
    countryDetector,
    header,
    page,
  }) => {
    await armConsent(page)
    const events = await collectAnalyticsEvents(page)
    await homePage.navigate(
      page,
      `${ROUTES.home}?utm_source=e2e`,
      'networkidle',
    )
    await countryDetector.closeModal()
    await expectEventCount(events, 'view_page', 1)
    const landing = eventsNamed(events, 'view_page')[0]!
    expect(landing).toMatchObject({ utm_source: 'e2e' })

    // Stands in for an hour without an event. `page.clock` would also run the
    // consent replay timer of `armConsent`.
    await page.evaluate((key) => {
      const session = JSON.parse(localStorage.getItem(key)!)
      session.lastEventAt -= 60 * 60 * 1000
      localStorage.setItem(key, JSON.stringify(session))
    }, SESSION_STORAGE_KEY)
    await header.wishlistLink.click()
    await page.waitForURL(/\/wishlist/)
    await expectEventCount(events, 'view_page', 2)

    // A late home page impression may start the new session before the
    // navigation does, so the first event with the new id is the one to check.
    const restarted = events.find(
      (event) => event.session_id !== landing.session_id,
    )!
    expect(restarted.landing_page_path).toBe(restarted.page_path)
    expect(restarted).not.toHaveProperty('utm_source')
    expect(eventsNamed(events, 'view_page')[1]!.session_id).toBe(
      restarted.session_id,
    )
  })
})
