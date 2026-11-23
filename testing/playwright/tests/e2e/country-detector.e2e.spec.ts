import { expect } from '@playwright/test'
import { test } from '../../fixtures/fixtures'

/**
 * @file Contains end-to-end tests for the Country Detector modal, verifying
 * its behavior when closing, switching shops via region links, staying on
 * the current shop, and its interaction with other page elements like flyouts.
 */

/**
 * Paths of the fixed shops these tests switch between. Unlike the other specs they cannot take
 * the shop from `BASE_URL`, and they only work with path routing.
 */
const EN_SHOP_PATH = '/en'
const DE_SHOP_PATH = '/de'

/**
 * Performs setup before each test case within this file.
 * It initially navigates to the English version of the homepage.
 */
test.beforeEach(async ({ page, countryDetector }) => {
  await expect(async () => {
    await countryDetector.navigate(page, EN_SHOP_PATH, 'networkidle')
  }).toPass()
})

/**
 * Test suite for a user whose `CF-IPCountry` request header says DE while
 * the page loads the US shop. Detection runs on the server from that header,
 * which forces the Country Detector modal to load so the tests can be executed.
 * The header override only takes effect against a target that Cloudflare does
 * not front (for example a local dev server), because Cloudflare overwrites
 * `CF-IPCountry`.
 */
test.describe('User from DE on the US shop', () => {
  test.skip(
    ({ baseURL }) =>
      !['localhost', '127.0.0.1', '[::1]'].includes(
        new URL(baseURL ?? '').hostname,
      ),
    'The CF-IPCountry override only reaches a target Cloudflare does not front',
  )
  test.use({
    extraHTTPHeaders: { 'CF-IPCountry': 'DE' },
  })

  test('C2141736: Verify Country Detector close button', async ({
    countryDetector,
  }) => {
    await countryDetector.closeButton.waitFor()
    await expect(async () => {
      await countryDetector.closeModal()
    }).toPass()
  })

  test('C2141737: Verify Country Detector switch shop', async ({
    countryDetector,
    page,
  }) => {
    // A DE user on /en is offered the DE shop, whose `countryCode` is `DE` (`country-detection-switch-de`).
    await countryDetector.switchToShop('de')

    await expect(async () => {
      expect(page.url()).toContain(DE_SHOP_PATH)
      await expect(countryDetector.dialog).toBeHidden()
    }).toPass({ timeout: 15_000 })
  })

  test('C2141738: Verify Country Detector stay in the shop', async ({
    countryDetector,
    page,
  }) => {
    await countryDetector.stayOnCurrentShop()

    expect(page.url()).toContain(EN_SHOP_PATH)
  })
})
