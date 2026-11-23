import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { navigateUsingLocatorHref } from '../../support/utils'
import { Base } from '../base/base'

/**
 * Page Object Model for the Country Detector modal.
 * Encapsulates locators and methods for interacting with and asserting states of
 * the country/shop selection popup that might appear on first visit.
 */
export class CountryDetector extends Base {
  // --- Country Detector Elements ---
  readonly closeButton: Locator
  readonly dialog: Locator
  readonly stayButton: Locator

  /**
   * Initializes the CountryDetector Page Object.
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    super(page)

    this.closeButton = page.getByTestId('close-button')
    this.dialog = page.getByTestId('country-detection-dialog')
    this.stayButton = page.getByTestId('country-detection-stay')
  }

  /**
   * Locator for a specific suggested-shop switch link, keyed by the
   * lower-cased detected country code (e.g. `fr` for `FR`). When the detected
   * country has several languages, each link appends the language code
   * (e.g. `ch-fr`).
   */
  switchShopLink(regionCode: string) {
    return this.page.getByTestId(`country-detection-switch-${regionCode}`)
  }

  /**
   * Follows a suggested-shop switch link (Inertia `SFButton` with `:to`).
   *
   * @param regionCode Lower-cased detected country code (e.g. `de` for `DE`)
   */
  async switchToShop(regionCode: string) {
    const link = this.switchShopLink(regionCode)
    await expect(link).toBeVisible({ timeout: 10_000 })
    await navigateUsingLocatorHref(this.page, link)
  }

  // --- Action Methods ---

  /**
   * Chooses to stay on the current shop and waits for the modal to close.
   */
  async stayOnCurrentShop() {
    await expect(this.stayButton).toBeVisible({ timeout: 10_000 })
    await this.stayButton.click()
    await expect(this.dialog).toBeHidden()
  }

  /**
   * Attempts to close the Country Detector modal if it is visible.
   * Waits for the page to be stable before checking for the button.
   * Handles cases where the modal might not be present by continuing execution.
   */
  async closeModal() {
    try {
      // Use a shorter timeout for networkidle to avoid long waits
      await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 })

      // Check if modal is visible with a reasonable timeout
      if (await this.closeButton.first().isVisible({ timeout: 5000 })) {
        await this.closeButton.first().click()
        await expect(this.closeButton.first()).toBeHidden({ timeout: 10000 })
        // Use domcontentloaded instead of networkidle for faster execution
        await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 })
      }
    } catch (error) {
      console.error('Error closing modal:', error)
      // Continue execution even if modal closing fails
    }
  }
}
