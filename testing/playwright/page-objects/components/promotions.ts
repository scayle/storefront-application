import { expect, type Locator, type Page } from '@playwright/test'
import type { Promotion } from '@scayle/storefront-api'
import { Base } from '../base/base'
import type { ActiveCampaign } from '../../support/storefrontAPIClient'

/**
 * Page Object Model for various Promotion components (e.g., ribbon, flyout).
 * Encapsulates locators for elements related to displaying and interacting with promotions.
 */
export class Promotions extends Base {
  // --- Promotion Ribbon Locators ---
  readonly promotionRibbon: Locator
  readonly promotionRibbonTimer: Locator
  readonly promotionRibbonHeadline: Locator
  readonly promotionRibbonSubheadline: Locator

  // --- Promotion Flyout Locators ---
  readonly closeFlyoutButton: Locator
  readonly promotionCard: Locator

  /**
   * Initializes the Promotions Page Object.
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    super(page)

    // Promotion Ribbon Locators
    this.promotionRibbon = page.getByTestId('promotion-ribbon')
    this.promotionRibbonTimer = page.getByTestId('promotion-ribbon-timer')
    this.promotionRibbonHeadline = page.getByTestId('promotion-ribbon-headline')
    this.promotionRibbonSubheadline = page.getByTestId(
      'promotion-ribbon-subheadline',
    )
    // Promotion Flyout Locators
    this.closeFlyoutButton = page
      .getByTestId('promotion-slide-in')
      .getByTestId('slide-in-close')
    this.promotionCard = page.getByTestId('promotion-card')
  }

  /**
   * Asserts that the ribbon timer is shown or absent, as the deal the ribbon
   * displays implies. The Storefront Application shows the campaign first, then
   * the promotion with the highest priority. A promotion without an end date has
   * no timer, like one with `hideCountdown`.
   *
   * @param campaign The active campaign, if any
   * @param promotions The active promotions, in any order
   */
  async assertRibbonCountdown(
    campaign: ActiveCampaign | undefined,
    promotions: Promotion[],
  ) {
    const [topPromotion] = [...promotions].sort(
      (a, b) => a.priority - b.priority,
    )
    const hidesCountdown =
      campaign?.hideCountdown ??
      (Boolean(topPromotion?.customData?.hideCountdown) ||
        !topPromotion?.schedule?.to)

    if (!hidesCountdown) {
      await expect(this.promotionRibbonTimer).toBeVisible()
      return
    }

    // The skeleton is the server-rendered stand-in for the timer, so its absence
    // holds before and after hydration, unlike the timer itself.
    await expect(
      this.promotionRibbon.getByTestId('countdown-skeleton'),
    ).toHaveCount(0)
    await expect(this.promotionRibbonTimer).toHaveCount(0)
  }
}
