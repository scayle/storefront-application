import type { Locator, Page } from '@playwright/test'
import { Base } from './base/base'

/**
 * Page Object Model for the checkout page.
 * Encapsulates locators and methods for interacting with the checkout process.
 */
export class CheckoutPage extends Base {
  readonly basketContainer: Locator
  readonly deliveryEstimate: Locator
  readonly itemQuantity: Locator
  readonly buttonItemRemove: Locator
  readonly checkboxAcceptTerms: Locator
  readonly ctaPayButton: Locator
  readonly paymentInvoice: Locator

  /**
   * Initializes the CheckoutPage Page Object.
   *
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    super(page)

    // The hosted checkout renders the basket twice on mobile, a hidden collapsible summary and the visible one.
    this.basketContainer = page
      .locator('[data-test-id="basket-container"]')
      .filter({ visible: true })
    this.deliveryEstimate = page.locator('[data-test-id="delivery-estimate"]')
    this.itemQuantity = page.locator('[data-test-id="item-quantity"]')
    this.buttonItemRemove = page.locator('[data-test-id="item-remove"]')
    this.checkboxAcceptTerms = page.locator(
      '[data-test-id="paymentBelowMobileBasket-termsAndPrivacy"]',
    )
    this.ctaPayButton = page.locator('[data-test-id="navigation-next-step"]')
    this.paymentInvoice = page.locator(
      '[data-test-id="paymentOptions-accounting"]',
    )
  }

  /**
   * Selects the invoice payment method and waits until the checkout has saved it.
   *
   * A click on the pay button that lands before the checkout finishes saving the method is
   * ignored, and checking an option that is already selected sends no request.
   */
  async selectInvoice() {
    if (await this.paymentInvoice.isChecked()) {
      return
    }
    await Promise.all([
      this.page.waitForResponse(
        (response) =>
          response.url().includes('/order/payment/option') && response.ok(),
        { timeout: 15_000 },
      ),
      this.paymentInvoice.check(),
    ])
  }
}
