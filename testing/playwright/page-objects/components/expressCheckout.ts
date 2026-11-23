import type { Locator, Page } from '@playwright/test'
import { Base } from '../base/base'

/**
 * Page Object Model for express checkout web components on PDP and basket.
 */
export class ExpressCheckout extends Base {
  readonly expressCheckoutComponent: Locator

  /**
   * Initializes the ExpressCheckout Page Object.
   *
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    super(page)
    this.expressCheckoutComponent = page.locator('scayle-express-checkout')
  }
}
