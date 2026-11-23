import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import { ROUTES } from '../../support/constants'
import { isMobile } from '../../support/utils'
import type { MobileNavigation } from '../../page-objects/components/mobileNavigation'
import type { ShopSelector } from '../../page-objects/components/shopSelector'

/**
 * @file Contains end-to-end tests for the Shop Selector functionality,
 * verifying the ability to switch between different shops.
 */

test.beforeEach(async ({ homePage, countryDetector, page }) => {
  await homePage.navigate(page, ROUTES.home, 'networkidle')
  await page.waitForLoadState('domcontentloaded')
  await countryDetector.closeModal()
})

/**
 * Skips the current test when the page has no shop selector. The storefront leaves
 * it out when the current shop is the only shop. Call this before the first assertion
 * that waits for the shop selector. On mobile it leaves the sidebar open.
 */
async function skipWithoutShopSelector(
  shopSelector: ShopSelector,
  mobileNavigation: MobileNavigation,
  page: Page,
) {
  if (isMobile(page)) {
    await mobileNavigation.openMobileSidebar()
  }

  test.skip(
    !(await shopSelector.isRendered()),
    'Shop selector is not shown because the shop has no other shop - skipping test',
  )
}

/**
 * Skips the current test when the open flyout lists no country besides the current one.
 * A shop with a single country and several languages still shows the shop selector,
 * but has no country to switch to.
 */
async function skipWithoutOtherCountry(shopSelector: ShopSelector) {
  test.skip(
    (await shopSelector.getSwitchTargetCount()) === 0,
    'Shop selector lists no other country - skipping test',
  )
}

/**
 * Verifies that the Shop Selector is initially visible in a closed
 * state, can be opened by clicking its toggle button, and allows switching
 * to a different shop, presumably navigating the user away from the current shop.
 */
test('C2162469: Verify Shop Selector switch to different shop', async ({
  shopSelector,
  page,
  mobileNavigation,
}) => {
  await skipWithoutShopSelector(shopSelector, mobileNavigation, page)

  await test.step('Assert Shop Selector is visible and in closed state', async () => {
    await shopSelector.assertShopSelectorIsVisible()
  })

  await test.step('Click Shop Selector toggle button and assert open state', async () => {
    await shopSelector.openShopSelector()
  })

  await skipWithoutOtherCountry(shopSelector)

  await test.step('Select different shop and assert the shop is switched', async () => {
    const initialUrl = page.url()

    await shopSelector.clickSwitchShop()
    await shopSelector.assertUrlHasChanged(initialUrl)
  })
})

/**
 * Verifies that the currently active shop in the Shop Selector is shown as
 * non-interactive text. Clicking it does not switch shops, navigate away,
 * or close the flyout.
 */
test('C2162470: Verify Shop Selector switch to the current shop', async ({
  shopSelector,
  page,
  mobileNavigation,
}) => {
  await skipWithoutShopSelector(shopSelector, mobileNavigation, page)

  const initialUrl = page.url()

  await test.step('Open Shop Selector flyout', async () => {
    await shopSelector.openShopSelector()
  })

  await test.step('Assert current shop is not a clickable switch target', async () => {
    await shopSelector.assertCurrentCountryIsNotClickable()
  })

  await test.step('Click current shop and assert no navigation or flyout close', async () => {
    await shopSelector.clickCurrentCountry()
    await shopSelector.assertUrlHasNotChanged(initialUrl)
    await shopSelector.assertShopSelectorIsOpen()
  })
})

/**
 * Verifies that when a user navigates away from the homepage
 * (in this case, to the Wishlist page) and then uses the Shop Selector
 * to switch to a different shop, the user is navigated away from the
 * current page (Wishlist) and to the selected shop.
 */
test('C2162471: Verify Shop Selector switch from non-Homepage', async ({
  shopSelector,
  page,
  mobileNavigation,
  header,
  wishlistPage,
}, testInfo) => {
  // Test skipped only for Mobile Safari due to timeouts that occurred in CI runs.
  // Feel free to remove the line below and try to execute the test locally or in CI to check if the timeouts are encountered.
  test.skip(
    testInfo.project.name === 'mobile-safari',
    'Potential CI execution issues in Mobile Safari',
  )

  await skipWithoutShopSelector(shopSelector, mobileNavigation, page)

  await test.step('Navigate to Wishlist page', async () => {
    await header.wishlistLink.click()
    await page.waitForLoadState('domcontentloaded')
    await wishlistPage.emptyState.waitFor()
  })

  await test.step('Switch the shop and assert Wishlist page is loaded in different shop', async () => {
    if (isMobile(page)) {
      await mobileNavigation.openMobileSidebar()
    }

    await shopSelector.assertShopSelectorIsVisible()
    await shopSelector.openShopSelector()
    await skipWithoutOtherCountry(shopSelector)
    await shopSelector.clickSwitchShop()

    const pageUrl = page.url()

    expect(pageUrl).not.toContain('/wishlist')
  })
})
