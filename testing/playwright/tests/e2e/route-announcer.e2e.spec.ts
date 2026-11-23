import { expect } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import { ROUTES } from '../../support/constants'

/**
 * @file Verifies that the screen-reader route announcer in the layout updates
 * its live region with a "Navigated to {title}" string on Inertia-driven
 * client navigations. This is the DOM-level proxy for what AT users will hear.
 */

test.beforeEach(async ({ homePage, countryDetector, page }) => {
  await homePage.navigate(page, ROUTES.home, 'networkidle')
  await page.waitForLoadState('domcontentloaded')
  await countryDetector.closeModal()
})

test('Route announcer updates the assertive live region on navigation', async ({
  header,
  page,
}) => {
  // `<SFLiveAnnouncer>` is mounted app-level and inside every modal/slide-in, so
  // several copies exist; with no modal open only the app-level one is visible.
  const liveRegion = page
    .getByTestId('live-announcer-assertive')
    .filter({ visible: true })

  await expect(liveRegion).toHaveCount(1)
  await expect(liveRegion).toHaveAttribute('aria-live', 'assertive')
  await expect(liveRegion).toHaveAttribute('role', 'alert')

  await test.step('Navigating to the wishlist page produces an announcement that contains the destination title', async () => {
    // The wishlist link is visible on every viewport and triggers a regular
    // Inertia visit — a viewport-agnostic way to exercise the announcer
    // without coupling the test to the desktop or mobile menu page-objects.
    const initialTitle = await page.title()
    await header.wishlistLink.click()

    // Wait for the navigation to land. Inertia visits don't fire a real
    // document-load event, and the URL changes before `<Head>` flushes the
    // new title, so we wait on both signals: URL change, then a title change
    // away from the previous page's value. Without the title wait, reading
    // `page.title()` returns the stale CMS-placeholder value and the
    // assertion would compare against the wrong expected substring.
    await page.waitForURL(/\/wishlist/)
    await page.waitForFunction((prev) => document.title !== prev, initialTitle)

    // Locale-agnostic assertion: the announcement prefix is a translated
    // string, so we don't hardcode "Navigated to" or "Navigiert zu". Checking
    // that the destination's document.title appears inside the live region
    // exercises the same integration without coupling the test to a specific
    // locale's copy. Reactivity (title change triggers announcement change)
    // is covered by the composable's unit tests.
    const title = await page.title()
    await expect(liveRegion).toContainText(title)
  })
})
