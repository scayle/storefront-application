import { expect } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import { ROUTES } from '../../support/constants'
import { skipForCatalogGap } from '../../support/productTestHelpers'

/**
 * @file Contains end-to-end tests for verifying the functionality and
 * visibility of promotion elements, including the promotion ribbon and flyout.
 *
 * The ribbon test needs an active promotion or campaign, and the flyout test
 * needs an active promotion. Each one asks the Storefront API what is running
 * and skips itself with a reason when there is nothing to show.
 */

/**
 * Verifies that the promotion ribbon is visible on the homepage and shows its
 * headline. The countdown timer is asserted as shown or absent, following the
 * `hideCountdown` flag of the campaign or promotion the ribbon displays.
 * It also checks if the ribbon remains visible after scrolling down the page
 * and asserts that it is not visible on the basket page.
 */
test('C2185235 Verify Promotion Ribbon', async ({
  promotions,
  page,
  basketPage,
  header,
  homePage,
  countryDetector,
  storefrontAPIClient,
}) => {
  const [activePromotions, activeCampaign] = await Promise.all([
    storefrontAPIClient.getActivePromotions(),
    storefrontAPIClient.getActiveCampaign(),
  ])

  skipForCatalogGap(
    'C2185235',
    !activeCampaign && activePromotions.length === 0,
    'No active promotion or campaign on this shop.',
  )

  await homePage.navigate(page, ROUTES.home, 'networkidle')
  await countryDetector.closeModal()

  await test.step('Check the Ribbon is visible and contains promotion or campaign data', async () => {
    await promotions.promotionRibbon.waitFor()
    await expect(promotions.promotionRibbon).toBeVisible()
    await promotions.assertRibbonCountdown(activeCampaign, activePromotions)
    await expect(promotions.promotionRibbonHeadline).toBeVisible()
  })

  await test.step('Check Ribbon scrolled state', async () => {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
    await expect(promotions.promotionRibbon).toBeVisible()
  })

  await test.step('Check Ribbon not visible on Basket page', async () => {
    await header.visitBasketPage()
    await basketPage.emptyState.waitFor()
    await expect(promotions.promotionRibbon).toBeHidden()
  })
})

/**
 * - Verifies that the promotion flyout button in the header can be clicked.
 * - Verifies that clicking the promotion flyout button opens the flyout
 * and shows at least one promotion card.
 */
test('C2185240 C2185241 Verify Promotion Flyout', async ({
  promotions,
  header,
  homePage,
  page,
  countryDetector,
  storefrontAPIClient,
}) => {
  const activePromotions = await storefrontAPIClient.getActivePromotions()

  skipForCatalogGap(
    'C2185240',
    activePromotions.length === 0,
    'No active promotion on this shop. The flyout test looks for promotion cards, and a campaign renders a separate campaign card, so an active campaign alone is not enough.',
  )

  await homePage.navigate(page, ROUTES.home, 'networkidle')
  await countryDetector.closeModal()

  await test.step('Check the Promotion flyout button', async () => {
    await header.promotionsButton.waitFor()
    await header.promotionsButton.click()
  })

  await test.step('Check the Promotion flyout open state', async () => {
    await promotions.closeFlyoutButton.waitFor()
    await expect(promotions.promotionCard.first()).toBeVisible()
  })
})
