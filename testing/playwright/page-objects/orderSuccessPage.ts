import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { NON_NUMERIC_PRICE_CHARS_REGEX } from '../support/constants'
import { Base } from './base/base'

/**
 * Page Object Model for the Order Success Page (OSP).
 * Encapsulates locators and methods for verifying the successful order confirmation,
 * displaying order details, and handling OSP error states.
 */
export class OrderSuccessPage extends Base {
  // --- Order Summary & User Greeting Locators ---
  readonly ospGreetingBox: Locator
  readonly ospGreetingBoxHeadline: Locator
  readonly ospOrderData: Locator
  readonly ospPaymentData: Locator
  readonly ospDeliveryAddress: Locator
  readonly ospDeliveryDate: Locator
  readonly ospCarrier: Locator

  // --- Ordered Product Details Locators ---
  readonly ospProductCard: Locator
  readonly ospProductImage: Locator
  readonly ospProductBrand: Locator
  readonly ospProductName: Locator
  readonly ospProductColor: Locator
  readonly ospProductSize: Locator
  readonly ospProductQuantity: Locator
  readonly ospProductPrice: Locator

  // --- Price Summary Locators ---
  readonly ospSubtotal: Locator
  readonly ospShippingCost: Locator
  readonly ospOtherFees: Locator
  readonly ospTotal: Locator

  // --- Call-to-Action (CTA) Buttons ---
  readonly ospButtonContinueShopping: Locator
  readonly ospButtonOrderDetails: Locator

  // --- Error/Empty State Locators (for failed order/invalid token) ---
  readonly ospEmptyStateContainer: Locator
  readonly ospEmptyStateIcon: Locator
  readonly ospEmptyStateHeadline: Locator
  readonly ospEmptyStateSubheadline: Locator
  readonly ospEmptyStateContinueShoppingButton: Locator

  /**
   * Initializes the OrderSuccessPage Page Object.
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    super(page)

    // Order Summary & User Greeting
    this.ospGreetingBox = page.getByTestId('success-greeting-box')
    this.ospGreetingBoxHeadline = page.getByTestId(
      'success-greeting-box-headline',
    )
    this.ospOrderData = page.getByTestId('success-order-data')
    this.ospPaymentData = page.getByTestId('success-payment-data')
    this.ospDeliveryAddress = page.getByTestId('success-delivery-address')
    this.ospDeliveryDate = page.getByTestId('success-delivery-date')
    this.ospCarrier = page.getByTestId('success-carrier')

    // Ordered Product Details
    this.ospProductCard = page.getByTestId('success-product-card')
    this.ospProductImage = page.getByTestId('success-product-image')
    this.ospProductBrand = page.getByTestId('success-product-brand')
    this.ospProductName = page.getByTestId('success-product-name')
    this.ospProductColor = page.getByTestId('success-product-color')
    this.ospProductSize = page.getByTestId('success-product-size')
    this.ospProductQuantity = page.getByTestId('success-product-quantity')
    this.ospProductPrice = page.getByTestId('success-product-price')

    // Price Summary
    this.ospSubtotal = page.getByTestId('success-subtotal')
    this.ospShippingCost = page.getByTestId('success-shipping-cost')
    this.ospOtherFees = page.getByTestId('success-other-fees')
    this.ospTotal = page.getByTestId('success-total')

    // Call-to-Action (CTA) Buttons
    // The page renders the buttons twice, below the order data on desktop and
    // below the summary on mobile, and hides one copy per viewport.
    this.ospButtonContinueShopping = page
      .getByTestId('success-continue-shopping-button')
      .filter({ visible: true })
    this.ospButtonOrderDetails = page
      .getByTestId('success-order-details-button')
      .filter({ visible: true })

    // Error/Empty State
    this.ospEmptyStateContainer = page.getByTestId('empty-state')
    this.ospEmptyStateIcon = page.getByTestId('empty-state-icon')
    this.ospEmptyStateHeadline = page.getByTestId('empty-state-headline')
    this.ospEmptyStateSubheadline = page.getByTestId('empty-state-subheadline')
    this.ospEmptyStateContinueShoppingButton = page.locator(
      '[data-testid="empty-state"] >> a',
    )
  }

  // --- Private Helper Methods ---

  /**
   * Extracts a numeric price value from a locator's text content.
   * Removes non-numeric characters (except period and hyphen) and parses to float.
   * @param locator - The Playwright Locator whose text content to parse.
   * @returns The extracted price as a number.
   */
  private async extractPrice(locator: Locator): Promise<number> {
    const text = await locator.textContent()

    return parseFloat(text?.replace(NON_NUMERIC_PRICE_CHARS_REGEX, '') ?? '0')
  }

  // --- Assertion Methods ---

  /**
   * Asserts the correctness of the price summary on the Order Success Page.
   * Verifies that the total price equals the subtotal plus shipping cost plus
   * other fees. The other fees row only renders for an order with a fee other
   * than delivery, for example a cash on delivery payment fee.
   * Uses the page object's internal locators for consistency.
   */
  async assertOspPriceSummary() {
    const subtotalPriceValue = await this.extractPrice(this.ospSubtotal)
    const shippingCostValue = await this.extractPrice(this.ospShippingCost)
    const totalPriceValue = await this.extractPrice(this.ospTotal)
    const otherFeesValue = (await this.ospOtherFees.count())
      ? await this.extractPrice(this.ospOtherFees)
      : 0

    expect(totalPriceValue).toBeCloseTo(
      subtotalPriceValue + shippingCostValue + otherFeesValue,
      2,
    )
  }
}
