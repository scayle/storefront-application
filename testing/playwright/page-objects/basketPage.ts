import { expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { ROUTES } from '../support/constants'
import type { CountryDetector } from './components/countryDetector'
import type { RPC } from './components/rpc'
import { Base } from './base/base'

export class BasketPage extends Base {
  private readonly rpc: RPC

  // --- Core Basket UI Elements ---
  readonly basketProductCard: Locator
  readonly productImage: Locator
  readonly productBrand: Locator
  readonly productName: Locator
  readonly quantitySelector: Locator
  readonly variantSelector: Locator
  readonly quantityValueMobile: Locator
  readonly quantityValueDesktop: Locator
  readonly buttonQuantityDecreaseMobile: Locator
  readonly buttonQuantityDecreaseDesktop: Locator
  readonly buttonQuantityIncreaseMobile: Locator
  readonly buttonQuantityIncreaseDesktop: Locator
  readonly removeItemButton: Locator
  readonly confirmRemoveItemButton: Locator

  // --- Price Summary Elements ---
  readonly priceSubtotal: Locator
  readonly priceFinal: Locator
  readonly initialProductPriceMobile: Locator
  readonly initialProductPriceDesktop: Locator
  readonly productPrice: Locator
  readonly discountSale: Locator
  readonly discountPromotion: Locator
  readonly promotionSummaryToggleButton: Locator
  readonly totalPromotionDiscount: Locator

  // --- Basket State Elements ---
  readonly emptyState: Locator
  readonly basketEmptyStateTitle: Locator
  readonly basketEmptyStateSubTitle: Locator
  readonly loginButton: Locator
  readonly continueButton: Locator
  readonly headlineUnavailableProducts: Locator
  readonly soldOutTitle: Locator
  readonly unavailableProductList: Locator
  readonly soldOutQuantitySelector: Locator
  readonly soldOutDeleteButton: Locator

  // --- Subscription Elements ---
  readonly basketSubscriptionData: Locator
  readonly basketSubscriptionMainLabel: Locator
  readonly basketSubscriptionAttributes: Locator

  // --- Low Stock Elements ---
  readonly basketLowStockBanner: Locator

  // --- Page Navigation/Generic Elements ---
  readonly checkoutButton: Locator
  readonly h1: Locator
  readonly pageTitle: Locator

  /**
   * Initializes the BasketPage Page Object.
   * @param page - The Playwright Page object.
   * @param rpc - The RPC (Remote Procedure Call) Page Object for direct API interactions.
   */
  constructor(page: Page, rpc: RPC) {
    super(page)
    this.rpc = rpc
    this.checkoutButton = page.getByTestId('checkout-link')
    this.productImage = page
      .getByTestId('basket-card')
      .getByTestId('product-image')
    this.basketProductCard = page.getByTestId('basket-card')
    this.emptyState = page.getByTestId('empty-state')
    this.basketEmptyStateTitle = this.emptyState.getByTestId(
      'empty-state-headline',
    )
    this.basketEmptyStateSubTitle = this.emptyState.getByTestId(
      'empty-state-subheadline',
    )
    this.loginButton = page.getByTestId('button-signin')
    this.continueButton = page.getByTestId('button-continue-shopping')
    this.productBrand = page
      .getByTestId('basket-product-brand')
      .getByTestId('main-label')
    this.productName = page
      .getByTestId('basket-product-brand')
      .getByTestId('sub-label')
    this.removeItemButton = page.getByTestId('basket-remove-item-button')
    this.confirmRemoveItemButton = page.getByTestId(
      'basket-remove-item-confirm-button',
    )
    this.priceSubtotal = page.getByTestId('basket-summary-subtotal')
    this.priceFinal = page.getByTestId('basket-final-price')
    this.discountSale = page.getByTestId('basket-discount-sale')
    this.discountPromotion = page.getByTestId('basket-discount-promotion')
    this.promotionSummaryToggleButton = page.getByTestId(
      'promotion-summary-toggle-button',
    )
    this.totalPromotionDiscount = page.getByTestId(
      'summary-total-promotion-reduction',
    )
    this.headlineUnavailableProducts = page.getByTestId(
      'headline-unavailable-products',
    )
    this.soldOutTitle = page.getByTestId('basket-card-sold-out-title')
    this.unavailableProductList = page.getByTestId('unavailable-product-list')
    this.quantitySelector = page.getByTestId('quantity-selector')
    this.variantSelector = page.getByTestId('basket-variant-selector')
    this.soldOutQuantitySelector =
      this.unavailableProductList.getByTestId('quantity-selector')
    this.soldOutDeleteButton = this.unavailableProductList.getByTestId(
      'basket-remove-item-button',
    )
    this.quantityValueMobile = page.getByTestId('quantity-value').nth(0)
    this.quantityValueDesktop = page.getByTestId('quantity-value').nth(1)
    this.buttonQuantityDecreaseMobile = page
      .getByTestId('quantity-minus')
      .nth(1)
    this.buttonQuantityDecreaseDesktop = page
      .getByTestId('quantity-minus')
      .nth(0)
    this.buttonQuantityIncreaseMobile = page.getByTestId('quantity-plus').nth(1)
    this.buttonQuantityIncreaseDesktop = page
      .getByTestId('quantity-plus')
      .nth(0)
    this.initialProductPriceMobile = page
      .getByTestId('initialProductPrice')
      .nth(0)
    this.initialProductPriceDesktop = page
      .getByTestId('initialProductPrice')
      .nth(1)
    this.productPrice = page.getByTestId('price')
    this.basketSubscriptionData = page
      .getByTestId('basket-card')
      .first()
      .getByTestId('subscription-data')
      .filter({ visible: true })
    this.basketSubscriptionMainLabel =
      this.basketSubscriptionData.getByTestId('main-label')
    this.basketSubscriptionAttributes =
      this.basketSubscriptionData.getByTestId('label-value')
    this.basketLowStockBanner = page
      .getByTestId('basket-card')
      .first()
      .getByTestId('low-stock-banner')
      .filter({ visible: true })
    this.h1 = page.locator('h1')
    this.pageTitle = page.getByTestId('headline')
  }

  // --- Getter functions ---

  /**
   * Getter for the "increase quantity" button, handles mobile and desktop viewports.
   */
  public get buttonQuantityIncrease(): Locator {
    return this.isMobileViewport
      ? this.buttonQuantityIncreaseMobile
      : this.buttonQuantityIncreaseDesktop
  }

  /**
   * Getter for the "decrease quantity" button, handles mobile and desktop viewports.
   */
  public get buttonQuantityDecrease(): Locator {
    return this.isMobileViewport
      ? this.buttonQuantityDecreaseMobile
      : this.buttonQuantityDecreaseDesktop
  }

  /**
   * Getter for the "quantity value", handles mobile and desktop viewports.
   */
  public get quantityValue(): Locator {
    return this.isMobileViewport
      ? this.quantityValueMobile
      : this.quantityValueDesktop
  }

  /**
   * Getter for the "initial product price", handles mobile and desktop viewports.
   */
  public get initialProductPrice(): Locator {
    return this.isMobileViewport
      ? this.initialProductPriceMobile
      : this.initialProductPriceDesktop
  }

  // --- Action Methods ---

  /**
   * Adds a product to the basket using an RPC (Remote Procedure Call) to the backend.
   * This bypasses UI interaction for faster test setup.
   * It can be also used to add product to basket in case this is not possible via UI, e.g. to test sold-out product.
   * @param variantId - The ID of the product variant to add.
   * @param quantity - The quantity of the product to add.
   */
  async addProductToBasket(variantId: number, quantity: number) {
    try {
      await this.rpc.call('addItemToBasket', {
        variantId,
        quantity,
      })
    } catch (error) {
      console.error('Error adding item to basket:', error)
      throw error
    }
  }

  /**
   * Picks another size on the first basket line through its variant selector.
   * The picker's options only render once its combobox is open.
   * @param variantId - The variant to switch the line to.
   */
  async chooseVariant(variantId: number) {
    const selector = this.variantSelector.first()
    const combobox = selector.getByRole('combobox')
    await expect(async () => {
      if ((await combobox.getAttribute('aria-expanded')) !== 'true') {
        await combobox.click()
      }
      await expect(combobox).toHaveAttribute('aria-expanded', 'true')
    }).toPass({ timeout: 10000 })
    await selector.getByTestId(`variant-option-${variantId}`).click()
  }

  /**
   * Removes the first visible item from the basket via UI interaction.
   * Clicks the remove button and confirms the action.
   */
  async removeItemFromBasket() {
    await this.removeItemButton.first().scrollIntoViewIfNeeded()
    await this.removeItemButton.first().click()
    await this.confirmRemoveItemButton.click()
  }

  // --- Assertion Methods ---

  /**
   * Asserts that a specific product is visible within the basket.
   * Checks for the presence of the product card, image, brand, and name.
   * @param productBrand - The expected brand name of the product.
   * @param productName - The expected name of the product.
   */
  async assertProductIsInBasket(productName: string) {
    await expect(this.basketProductCard).toBeVisible()
    await expect(this.productImage).toBeVisible()
    await expect(this.productName).toContainText(productName)
  }

  /**
   * Asserts that subscription product information is visible on the basket card.
   * Checks the main label, interval row, and follow-up delivery row.
   * @param expectedIntervalLabel - The expected subscription interval label.
   */
  async assertSubscriptionProductInfo(expectedIntervalLabel: string) {
    await expect(this.basketSubscriptionData).toBeVisible()
    await expect(this.basketSubscriptionMainLabel).toBeVisible()
    await expect(this.basketSubscriptionAttributes).toHaveCount(2)
    await expect(this.basketSubscriptionAttributes.nth(0)).toContainText(
      expectedIntervalLabel,
    )
    await expect(this.basketSubscriptionAttributes.nth(1)).toContainText('1')
  }

  /**
   * Asserts that the "Continue Shopping" button is visible and functional.
   * Clicks the button and waits until the URL is the shop homepage, not a subpath such
   * as `/de/basket`.
   *
   * @param homepageUrl - URL of the shop homepage, for example `getHomepageUrl(baseURL)`.
   */
  async assertContinueButton(homepageUrl: string) {
    await expect(this.continueButton).toBeVisible()
    await this.continueButton.click()
    await expect(this.page).toHaveURL(homepageUrl)
  }

  /**
   * Asserts that the "Login" button is visible within the basket context and
   * clicks it. Verifies navigation to the sign-in page.
   */
  async assertLoginButton() {
    if (this.page.url().includes(`/${ROUTES.signin}`)) {
      return
    }
    await expect(this.loginButton).toBeVisible()
    await this.loginButton.click()
    await expect(this.page).toHaveURL(new RegExp(`/${ROUTES.signin}`))
  }

  /**
   * Adds a variant like `addProductToBasket`, but reports a variant that ran out of stock between
   * the Storefront API answer and the add as `false`, so a caller can try another product. Any
   * other error is thrown.
   *
   * @param variantId - The ID of the product variant to add.
   * @param quantity - The quantity to add, 1 by default.
   * @returns True when the variant was added, false when it was out of stock.
   */
  async tryAddProductToBasket(
    variantId: number,
    quantity = 1,
  ): Promise<boolean> {
    try {
      await this.addProductToBasket(variantId, quantity)
      return true
    } catch (error) {
      const message = String(error)
      if (
        message.includes('Variant out of stock') ||
        message.includes('VARIANT_OUT_OF_STOCK')
      ) {
        return false
      }
      throw error
    }
  }

  /**
   * Opens the basket page, waits for the first product card and the final price, and reads the
   * subtotal and the final price in minor units. The page is loaded fresh, so the basket shows
   * what the shop applies and not what the Storefront API listed.
   *
   * @returns The subtotal and the final price of the price summary.
   */
  async openBasketAndReadPrices(
    page: Page,
    countryDetector: CountryDetector,
  ): Promise<{ subtotal: number; finalPrice: number }> {
    await this.navigate(page, ROUTES.basket, 'networkidle')
    await countryDetector.closeModal()
    await this.basketProductCard.waitFor()
    await this.priceFinal.first().waitFor()

    return {
      subtotal: await this.readPrice(this.priceSubtotal),
      finalPrice: await this.readPrice(this.priceFinal.first()),
    }
  }

  /**
   * Reports whether the basket lists a promotion discount. The promotion summary toggle also
   * renders for a campaign reduction alone, so the check opens the summary and looks for a
   * promotion line. The basket can show its promotion data after the page, so it waits up to
   * `timeout` milliseconds for the toggle and again for the line.
   *
   * @param timeout The milliseconds to wait for the toggle and for the promotion line
   * @returns True when a promotion discount line is visible
   */
  async hasPromotionDiscount(timeout = 3000): Promise<boolean> {
    const hasToggle = await this.promotionSummaryToggleButton
      .waitFor({ state: 'visible', timeout })
      .then(
        () => true,
        () => false,
      )
    if (!hasToggle) {
      return false
    }

    if (!(await this.discountPromotion.first().isVisible())) {
      await this.promotionSummaryToggleButton.click()
    }

    return this.discountPromotion
      .first()
      .waitFor({ state: 'visible', timeout })
      .then(
        () => true,
        () => false,
      )
  }

  /**
   * Opens the promotion summary of the price summary when it is closed.
   */
  async openPromotionSummary() {
    if (!(await this.discountPromotion.first().isVisible())) {
      await this.promotionSummaryToggleButton.click()
    }
    await expect(this.discountPromotion.first()).toBeVisible()
  }

  /**
   * Reads a formatted price as an integer number of minor units, for example `159,00 €` as 15900
   * and `1.159,00 €` as 115900. Dropping every character except digits and the minus sign works
   * for formats with two decimals in any locale, and integers keep sums and differences exact.
   * It throws when the text has no digits, so an empty price cannot make a check pass.
   */
  private async readPrice(locator: Locator): Promise<number> {
    const text = (await locator.textContent()) ?? ''
    const minorUnits = Number.parseInt(text.replace(/[^0-9-]/g, ''), 10)
    expect(
      Number.isFinite(minorUnits),
      `The price text "${text}" has no digits`,
    ).toBe(true)

    return minorUnits
  }

  /**
   * Asserts that the subtotal of the price summary equals a price from the Storefront API.
   * A test that picks its product because the summary shows no discount uses it to check
   * something the selection did not use.
   *
   * @param expectedMinorUnits The expected subtotal in minor units, for example the `withTax`
   *   price of the variant
   */
  async assertSubtotal(expectedMinorUnits: number) {
    expect(
      await this.readPrice(this.priceSubtotal),
      'The basket subtotal differs from the Storefront API price of the product',
    ).toBe(expectedMinorUnits)
  }

  /**
   * Asserts the correctness of the basket's price summary.
   * Compares the final price against the subtotal and an optional discount. With 'promotion', the
   * discount is the promotion and campaign total plus every sale line. 'any' uses the same sum but
   * does not expect a discount to exist: it checks the arithmetic of whatever the basket shows,
   * from no discount to a sale and a promotion together. Without an argument, no discount is allowed.
   * @param discountType - Optional: 'sale' or 'promotion' if a discount is expected, 'any' for
   *   whatever the basket shows.
   * @throws {Error} If an invalid discountType is provided.
   */
  async assertBasketPriceSummary(discountType?: 'sale' | 'promotion' | 'any') {
    const extractPrice = (locator: Locator) => this.readPrice(locator)

    const priceSubtotalValue = await extractPrice(this.priceSubtotal)
    const priceFinalValue = await extractPrice(this.priceFinal.first())

    let discountValue = 0

    if (discountType === 'sale') {
      discountValue = await extractPrice(this.discountSale.first())
    } else if (discountType === 'promotion' || discountType === 'any') {
      // The promotion total holds promotion and campaign reductions of every promotion. A product
      // with a sale price keeps it, so every sale line comes off the subtotal as well. Each row
      // only renders when its sum is above zero.
      const promotionTotal =
        (await this.totalPromotionDiscount.count()) > 0
          ? Math.abs(await extractPrice(this.totalPromotionDiscount))
          : 0
      let saleTotal = 0
      for (const saleLine of await this.discountSale.all()) {
        saleTotal += Math.abs(await extractPrice(saleLine))
      }
      discountValue = promotionTotal + saleTotal
    } else if (discountType !== undefined) {
      throw new Error(
        `Invalid discountType: '${discountType}'. Expected 'sale', 'promotion', 'any', or undefined.`,
      )
    }

    expect(priceFinalValue).toEqual(
      priceSubtotalValue - Math.abs(discountValue),
    )
    expect(priceSubtotalValue).toEqual(
      priceFinalValue + Math.abs(discountValue),
    )
  }

  /**
   * Asserts the opacity of the product image for sold-out items in the basket.
   * Used to verify visual state of unavailable products.
   * @param opacity - The expected opacity value as a string (e.g., '0.5').
   */
  async assertSoldOutImageOpacity(opacity: string) {
    const productImage =
      this.unavailableProductList.getByTestId('product-image')
    const productImageOpacity = await productImage.evaluate((el) =>
      String(window.getComputedStyle(el).opacity).trim(),
    )

    expect(productImageOpacity).toBe(opacity)
  }
}
