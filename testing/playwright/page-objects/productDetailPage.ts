import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { navigateUsingLocatorHref } from '../support/utils'
import { AddToBasketSlideIn } from './components/addToBasketSlideIn'
import { Base } from './base/base'

/**
 * Page Object Model for the Product Detail Page (PDP).
 * Encapsulates locators and methods for interacting with and asserting states on
 * individual product pages, including variant selection, basket/wishlist actions,
 * and store availability.
 */
export class ProductDetailPage extends Base {
  // --- Core Product Information Locators ---
  readonly productImage: Locator
  readonly productImageMain: Locator
  readonly imageSlideMain: Locator
  readonly productBrand: Locator
  readonly productName: Locator
  readonly priceRegular: Locator
  readonly taxInfo: Locator
  readonly h1: Locator
  readonly pageTitle: Locator

  // --- Variant Selection Locators ---
  readonly variantPicker: Locator
  readonly itemStatus: Locator

  // --- Quantity Selector Locators ---
  readonly quantityValue: Locator
  readonly quantityMinus: Locator
  readonly quantityPlus: Locator

  // --- Basket / Wishlist Actions Locators ---
  readonly addToBasketButton: Locator
  readonly addToBasketButtonMobile: Locator
  /**
   * Wishlist heart beside the main PDP add-to-basket control (`SFProductActions` buy row).
   * Mobile and desktop fields share the same DOM node. The row is `max-lg:hidden` on narrow
   * viewports, so wishlist actions use a DOM `click()` in the page object instead of a pointer click.
   */
  readonly buttonAddToWishlistMobile: Locator
  readonly buttonAddToWishlistDesktop: Locator
  readonly buttonRemoveFromWishlistMobile: Locator
  readonly buttonRemoveFromWishlistDesktop: Locator

  // --- Subscription Service Locators ---
  readonly subscriptionService: Locator
  readonly addToBasketButtonSubscribe: Locator

  // --- Low Stock Locators ---
  readonly lowStockBanner: Locator

  // --- Price Information Modal Locators ---
  /** Price info icon that opens the price information modal when the product is discounted. */
  readonly priceDetailsButton: Locator
  /** Price information modal dialog (`SFPriceInfoModal`). Visible only when opened. */
  readonly priceInfoModal: Locator
  /** Close button inside the price information modal. */
  readonly priceInfoModalCloseButton: Locator

  // --- Store Availability / Store Selector Locators ---
  readonly variantAvailabilityComponent: Locator
  readonly storeAvailabilityHeadline: Locator
  readonly storeAvailabilitySubline: Locator
  readonly buttonOpenStoreFlyout: Locator
  readonly storeSelectorSlideIn: Locator
  readonly storeInput: Locator
  readonly buttonSearchStore: Locator
  readonly locationStoreList: Locator
  readonly locationStoreListItem: Locator
  readonly buttonChooseStore: Locator
  readonly storeName: Locator

  // --- Product Siblings Locators ---
  readonly productSiblingImage: Locator
  readonly productSiblingLink: Locator

  // --- Product Breadcrumb Locators (PDP category breadcrumb links) ---
  /** All category-level breadcrumb links (e.g. women, clothing, pants). Use .nth(i) or .last() for specific level. */
  readonly breadcrumbCategoryLinks: Locator

  // --- Product Information Accordion Locators ---
  readonly productInfoAccordion: Locator
  readonly productInfoAccordionDetails: Locator

  // --- Image Gallery Locators ---
  /** Product gallery container (mobile swipe slider + desktop image grid). */
  readonly productGallery: Locator
  /** Main product image carousel (mobile swipe slider, below 640px). */
  readonly mainProductImage: Locator
  /** Image grid shown from 640px up, one tile per product image. */
  readonly productImageGrid: Locator

  // --- Image Gallery (mobile slider dots) Locators ---
  /** Container of the slider dots shown on mobile below the main product image. */
  readonly imageGallerySliderDots: Locator

  // --- Image Gallery (zoom overlay / lightbox) Locators ---
  /** Open dialog element when the image zoom overlay is visible. */
  readonly imageGalleryOverlayDialog: Locator
  /** Left arrow button inside the zoom overlay to go to previous image. */
  readonly imageGalleryOverlayArrowLeft: Locator
  /** Right arrow button inside the zoom overlay to go to next image. */
  readonly imageGalleryOverlayArrowRight: Locator
  /** Close button inside the zoom overlay. */
  readonly imageGalleryOverlayCloseButton: Locator
  /** Footer under the zoom carousel: slide position and prev/next buttons. */
  readonly imageGalleryOverlayFooter: Locator
  /** Visible "{current} of {total}" label inside the zoom overlay footer. */
  readonly imageGalleryOverlayPosition: Locator
  /** Carousel region inside the zoom overlay. */
  readonly imageGalleryOverlaySlider: Locator
  /** Scrollable slider container inside the zoom overlay (for swipe navigation on mobile). */
  readonly imageGalleryOverlayScrollableSlider: Locator

  // --- Recently Viewed Products Slider Locators ---
  /** Container of the recently viewed products slider. Only present in DOM when there are recently viewed products. */
  readonly recentlyViewedProductsSlider: Locator

  // --- Similar Products Slider Locators ---
  /** Container of the similar products slider. Only present in DOM when there are similar products. */
  readonly similarProductsSlider: Locator

  /**
   * Initializes the ProductDetailPage Page Object.
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    super(page)

    // Core Product Information
    this.addToBasketButton = page.getByTestId('add-item-to-basket-button')
    this.productImage = page.getByTestId('product-image')
    this.productImageMain = page.getByTestId('product-image-0')
    this.imageSlideMain = page.getByTestId('image-gallery-slide-0')
    this.productBrand = page.getByTestId('pdp-product-brand')
    this.productName = page.getByTestId('pdp-product-name')
    this.priceRegular = page.getByTestId('price')
    this.taxInfo = page.getByTestId('tax-info')
    this.h1 = page.locator('h1')
    this.pageTitle = page.getByTestId('pdp-product-brand')

    // Variant Selection
    this.variantPicker = page.getByTestId('variant-picker')
    this.itemStatus = page.getByTestId('item-status')

    // Quantity Selector
    this.quantityValue = page.getByTestId('quantity-value')
    this.quantityMinus = page.getByTestId('quantity-minus')
    this.quantityPlus = page.getByTestId('quantity-plus')

    // Basket / Wishlist Actions
    this.addToBasketButtonMobile = page.getByTestId(
      'add-to-basket-button-mobile',
    )
    const pdpBuyRow = page
      .getByTestId('add-item-to-basket-button')
      .first()
      .locator('xpath=..')
    const buyRowAddWishlist = pdpBuyRow.getByTestId(
      'add-item-to-wishlist-button',
    )
    const buyRowRemoveWishlist = pdpBuyRow.getByTestId(
      'remove-item-from-wishlist-button',
    )
    this.buttonAddToWishlistMobile = buyRowAddWishlist
    this.buttonAddToWishlistDesktop = buyRowAddWishlist
    this.buttonRemoveFromWishlistMobile = buyRowRemoveWishlist
    this.buttonRemoveFromWishlistDesktop = buyRowRemoveWishlist

    // Subscription Service
    this.subscriptionService = page.getByTestId('subscription-service')
    this.addToBasketButtonSubscribe = page.getByTestId(
      'add-item-to-basket-button-subscribe',
    )

    // Low Stock
    this.lowStockBanner = page.getByTestId('low-stock-banner')

    // Price Information Modal
    this.priceDetailsButton = page.getByTestId('price-info-trigger')
    this.priceInfoModal = page.getByTestId('price-info-modal')
    this.priceInfoModalCloseButton =
      this.priceInfoModal.getByTestId('close-button')

    // Store Availability / Store Selector
    this.variantAvailabilityComponent = page.getByTestId(
      'store-variant-availability-component',
    )
    this.storeAvailabilityHeadline = page.getByTestId(
      'store-availability-headline',
    )
    this.storeAvailabilitySubline = page.getByTestId(
      'store-availability-subline',
    )
    this.buttonOpenStoreFlyout = page.getByTestId('button-open-store-flyout')
    this.storeSelectorSlideIn = page.getByTestId('slide-in-overflow')
    this.storeInput = page.getByTestId('store-input')
    this.buttonSearchStore = page.getByTestId('search-store-button')
    this.locationStoreList = page.getByTestId('location-store-list')
    this.locationStoreListItem = page.getByTestId('location-store-list-item')
    this.buttonChooseStore = page.getByTestId('choose-store-button')
    this.storeName = page.getByTestId('store-name')

    // Product Siblings Selectors
    this.productSiblingImage = page.getByTestId('product-sibling-image')
    this.productSiblingLink = page.getByTestId('product-sibling-link')

    // Product Breadcrumb (PDP category levels via SFBreadcrumb, desktop: hidden lg:block)
    this.breadcrumbCategoryLinks = page.getByTestId(/^breadcrumb-item-\d+$/)

    // Product Information Accordion (`SFProductDetails` via `SFAccordion`)
    this.productInfoAccordion = page.getByTestId('accordion-summary')
    this.productInfoAccordionDetails = this.productInfoAccordion.locator(
      'xpath=ancestor::details[1]',
    )

    // Image Gallery (mobile swipe slider below 640px, image grid from 640px up)
    this.productGallery = page.getByTestId('product-gallery')
    this.mainProductImage = page.getByTestId('main-product-image')
    this.productImageGrid =
      this.productGallery.getByTestId('product-image-grid')

    // Image Gallery (mobile slider dots, shown on mobile below main image)
    this.imageGallerySliderDots =
      this.productGallery.getByTestId('image-slider-dots')

    // Image Gallery (zoom overlay modal, only present when overlay is open)
    this.imageGalleryOverlayDialog = page.locator('dialog[open]')
    this.imageGalleryOverlaySlider =
      this.imageGalleryOverlayDialog.getByTestId('zoom-gallery')
    this.imageGalleryOverlayFooter = this.imageGalleryOverlayDialog.getByTestId(
      'zoom-gallery-footer',
    )
    this.imageGalleryOverlayPosition =
      this.imageGalleryOverlayFooter.locator('p')
    // Prev/next sit in the footer, beside the carousel region.
    this.imageGalleryOverlayArrowLeft =
      this.imageGalleryOverlayDialog.getByTestId('zoom-gallery-prev-button')
    this.imageGalleryOverlayArrowRight =
      this.imageGalleryOverlayDialog.getByTestId('zoom-gallery-next-button')
    this.imageGalleryOverlayCloseButton =
      this.imageGalleryOverlayDialog.getByTestId('close-button')
    // The `zoom-gallery` element is the scroller itself, a nested lookup for
    // `.overflow-x-auto` would only match its descendants.
    this.imageGalleryOverlayScrollableSlider = this.imageGalleryOverlaySlider

    // Recently Viewed Products Slider (only in DOM when there are recently viewed products)
    this.recentlyViewedProductsSlider = page.getByTestId(
      'recently-viewed-products-slider',
    )

    // Similar Products Slider (only in DOM when there are similar products)
    this.similarProductsSlider = page.getByTestId('similar-products-slider')
  }

  /**
   * Returns a locator for a product card within the recently viewed products slider.
   * @param productId - The product ID of the recently viewed item.
   * @returns Locator for the product card (article) in the recently viewed slider.
   */
  getRecentlyViewedProductCard(productId: number): Locator {
    return this.recentlyViewedProductsSlider.locator(
      `[data-testid="article-${productId}"]`,
    )
  }

  /**
   * Returns the breadcrumb category link at the given index (0 = root level, e.g. women; last = lowest level, e.g. pants).
   */
  getBreadcrumbCategoryLink(index: number): Locator {
    return this.page.getByTestId(`breadcrumb-item-${index}`)
  }

  /**
   * Returns the slider dot locator at the given index (mobile image gallery).
   * Active dot has class containing bg-primary.
   */
  getImageGallerySliderDot(index: number): Locator {
    return this.productGallery.getByTestId(`image-slider-dot-${index}`)
  }

  /**
   * Returns the image grid tile button at the given index (the grid shown from
   * 640px up). Clicking a tile opens the zoom overlay at that image.
   */
  getProductGridTile(index: number): Locator {
    return this.productGallery.getByTestId(`product-grid-tile-${index}`)
  }

  /**
   * Returns the zoom overlay slide at the given index, only while it is the
   * active slide. Inactive slides stay in the DOM (scrolled aside), so a bare
   * test id would match a slide that is not on screen.
   */
  getImageGalleryOverlaySlide(index: number): Locator {
    return this.imageGalleryOverlayDialog.locator(
      `[data-testid="zoom-gallery-slide-${index}"]:not([inert])`,
    )
  }

  /**
   * Returns the zoom overlay image at the given index, only while that slide
   * is active. Video slides have no image, so this locator is empty for them.
   */
  getImageGalleryOverlayImage(index: number): Locator {
    return this.getImageGalleryOverlaySlide(index).getByTestId(
      `product-image-zoom-${index}`,
    )
  }

  // --- Getter functions ---

  /**
   * Primary visible slide in the main PDP image gallery (active slide without `inert`).
   */
  get mainImageSlide(): Locator {
    return this.mainProductImage
      .locator('[data-testid^="image-gallery-slide-"]:not([inert])')
      .first()
  }

  /**
   * Locator for the PDP wishlist toggle in the main buy row (same target on all viewports).
   */
  private get buttonAddToWishlist(): Locator {
    return this.buttonAddToWishlistDesktop
  }

  /**
   * Locator for the PDP "remove from wishlist" control in the main buy row (same target on all viewports).
   */
  private get buttonRemoveFromWishlist(): Locator {
    return this.buttonRemoveFromWishlistDesktop
  }

  // --- Private Helper Methods ---

  /**
   * Returns a Locator for a specific product variant option (e.g., a size).
   * @param variantId - Optional: The data-testid of the specific variant option (e.g., 'variant-option-123').
   * If not provided, selects the first non-disabled variant option.
   * @returns A Playwright Locator for the product variant option.
   */
  getVariant(variantId?: string): Locator {
    const selector = variantId
      ? `[data-testid="variant-option-${variantId}"]`
      : '[data-testid^="variant-option-"]:not([aria-disabled="true"])'

    return this.variantPicker.locator(selector).first()
  }

  /**
   * Returns a random, non-disabled product variant option from a given locator.
   *
   * @param availableVariantsLocator - A locator that has already found all available variants.
   * @returns A Playwright Locator for a randomly selected available variant.
   */
  async getRandomVariant(availableVariantsLocator: Locator): Promise<Locator> {
    const count = await availableVariantsLocator.count()

    if (count === 0) {
      throw new Error('No available product variants found to select from.')
    }

    const randomIndex = Math.floor(Math.random() * count)
    return availableVariantsLocator.nth(randomIndex)
  }

  /**
   * Returns the PDP buy-row "add to wishlist" control beside the main add-to-basket button.
   *
   * @returns Locator for the wishlist toggle in add state
   */
  private getAddToWishlistButton(): Locator {
    return this.buttonAddToWishlist
  }

  /**
   * Clicks the PDP wishlist toggle. On mobile the control lives in a `max-lg:hidden` row, so it
   * is not visible or hit-testable. Calling `HTMLElement.click()` in the page still runs Vue handlers.
   */
  private async clickPdpWishlistControl(locator: Locator) {
    await locator.waitFor({ state: 'attached' })
    if (this.isMobileViewport) {
      await locator.evaluate((el: HTMLElement) => {
        el.click()
      })
    } else {
      await locator.click()
    }
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Clicks a control in the PDP buy area (quantity, variant row, etc.). On mobile the gallery or promos
   * can sit above the control and intercept pointer events, so we use `HTMLElement.click()` there.
   */
  private async clickPdpBuyColumnControl(locator: Locator) {
    await locator.waitFor({ state: 'attached' })
    if (this.isMobileViewport) {
      await locator.evaluate((el: HTMLElement) => {
        el.click()
      })
    } else {
      await locator.click()
    }
  }

  // --- Action Methods ---

  /**
   * Opens the variant picker list when it is closed and waits until it is expanded. Unlike
   * `chooseProductVariant`, it does not wait for the deferred props first.
   * The list opens below the combobox and moves with the page. With many sizes its last options
   * fall below a 720 px viewport, where Playwright refuses to click them, so the combobox goes to
   * the top of the viewport first.
   */
  async openVariantPicker() {
    const combobox = this.variantPicker.getByRole('combobox')
    if ((await combobox.getAttribute('aria-expanded')) !== 'true') {
      await combobox.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ block: 'start' })
        el.click()
      })
    }
    await expect(combobox).toHaveAttribute('aria-expanded', 'true')
  }

  /**
   * Clicks a variant option in the open picker, by id or the first enabled option when id is omitted.
   */
  async clickVariantOption(variantId?: string) {
    await this.clickPdpBuyColumnControl(this.getVariant(variantId))
  }

  /**
   * Clicks the PDP quantity "+" control (increases line quantity).
   */
  async clickQuantityPlus() {
    await this.clickPdpBuyColumnControl(this.quantityPlus)
  }

  /**
   * Clicks the PDP quantity decrease control.
   */
  async clickQuantityMinus() {
    await this.clickPdpBuyColumnControl(this.quantityMinus)
  }

  /**
   * Clicks the PDP price info trigger to open the price information modal.
   * On mobile the trigger is an `<svg>` without `HTMLElement.click()`, so a bubbling
   * click event is dispatched to reach the parent button handler.
   */
  async clickPriceDetailsButton() {
    await this.priceDetailsButton.waitFor({ state: 'attached' })
    if (this.isMobileViewport) {
      await this.priceDetailsButton.evaluate((el) => {
        el.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true }),
        )
      })
      return
    }

    await this.priceDetailsButton.click()
  }

  /**
   * Clicks the close button inside the open price information modal.
   */
  async clickPriceInfoModalCloseButton() {
    await this.priceInfoModalCloseButton.click()
  }

  /**
   * Clicks the PDP product information accordion header (`SFAccordion` summary).
   * On mobile, fixed chrome can intercept pointer events, so the click is dispatched via script.
   */
  async clickProductInfoAccordion(nth = 0) {
    const accordion = this.productInfoAccordion.nth(nth)
    await accordion.scrollIntoViewIfNeeded()
    await accordion.waitFor()
    await this.clickPdpBuyColumnControl(accordion)
  }

  /**
   * Opens a product sibling PDP via the link `href`. Pointer clicks on swatches are unreliable when the gallery
   * or adjacent swatches overlap the hit target, so tests navigate to the rendered URL instead.
   */
  async clickProductSiblingLink(siblingLink: Locator) {
    await siblingLink.scrollIntoViewIfNeeded()
    await navigateUsingLocatorHref(this.page, siblingLink)
  }

  /**
   * Adds the currently displayed product to the basket via UI interaction.
   * Chooses the appropriate "Add to Basket" button based on device type.
   *
   * A successful add opens the add-to-basket confirmation slide-in, a modal
   * dialog that makes the rest of the page inert. It is dismissed here by
   * default so callers can keep interacting with the page; pass
   * `dismissSlideIn: false` when the test asserts on the slide-in itself.
   * @param options.dismissSlideIn - Whether to close the confirmation slide-in after the add.
   */
  async addProductToBasket({
    dismissSlideIn = true,
  }: { dismissSlideIn?: boolean } = {}) {
    const targetButton = this.isMobileViewport
      ? this.addToBasketButtonMobile
      : this.addToBasketButton

    await targetButton.scrollIntoViewIfNeeded()
    await targetButton.waitFor({ state: 'visible' })

    // The mobile size sheet uses a top-layer backdrop. `click({ force: true })`
    // still hits whatever is at the button's coordinates, so wait until the
    // list is closed and use a DOM click on mobile (same as other PDP controls).
    await expect(this.variantPicker.getByRole('combobox')).toHaveAttribute(
      'aria-expanded',
      'false',
    )

    const addResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/basket/add') &&
        response.request().method() === 'POST',
    )

    if (this.isMobileViewport) {
      await targetButton.evaluate((el: HTMLElement) => {
        el.click()
      })
    } else {
      await targetButton.click()
    }

    await addResponse

    if (dismissSlideIn) {
      await new AddToBasketSlideIn(this.page).dismiss()
    }
  }

  /**
   * Adds the current product to the wishlist via the heart control beside the main add-to-basket button.
   */
  async addProductToWishlist() {
    await this.clickPdpWishlistControl(this.getAddToWishlistButton())
  }

  /**
   * Removes the current product from the wishlist via the same buy-row heart control.
   */
  async removeProductFromWishlist() {
    await this.clickPdpWishlistControl(this.buttonRemoveFromWishlist)
  }

  /**
   * Selects a buyable variant on the PDP.
   * One-size products leave the picker disabled with the variant already active.
   * Multi-variant products: opens the list and clicks the first non-sold-out option.
   */
  async chooseProductVariant() {
    await this.selectVariant((options) => options.first())
  }

  /**
   * Opens the variant picker, clicks the option `pickOption` returns and waits until the
   * page has taken it as the active variant.
   *
   * The options panel is fixed to the viewport right below the trigger. Content that loads
   * after the first render pushes the trigger down to the edge of the viewport, which leaves
   * the options outside of it, where scrolling cannot reach them. So after the list is open
   * the trigger is centered, and the scroll listener of the dropdown moves the panel along.
   * Open, scroll, click and check retry together for up to 10 s, so a layout shift in between
   * starts the attempt over. When the retries run out, the error carries the last attempt's
   * failure, because the timeout of the retry loop alone does not say what went wrong.
   */
  private async selectVariant(
    pickOption: (availableOptions: Locator) => Locator | Promise<Locator>,
  ) {
    const combobox = this.variantPicker.getByRole('combobox')
    if ((await combobox.getAttribute('aria-disabled')) === 'true') {
      return
    }

    const availableOptions = this.variantPicker.locator(
      '[data-testid^="variant-option-"]:not([aria-disabled="true"])',
    )

    await this.waitForDeferredReloads()

    let lastAttemptError: unknown
    try {
      await expect(async () => {
        try {
          await this.attemptVariantSelection(
            combobox,
            availableOptions,
            pickOption,
          )
        } catch (error) {
          lastAttemptError = error
          throw error
        }
      }).toPass({ timeout: 10_000 })
    } catch (error) {
      const reason =
        lastAttemptError instanceof Error
          ? lastAttemptError.message.split('\n').slice(0, 14).join('\n')
          : 'no attempt finished'
      throw new Error(`Choosing a size failed, last attempt: ${reason}`, {
        cause: lastAttemptError ?? error,
      })
    }
  }

  /**
   * Runs one attempt of `selectVariant`: opens the list, centers the trigger on desktop,
   * clicks the option and waits for the URL and the selected state to show it.
   */
  private async attemptVariantSelection(
    combobox: Locator,
    availableOptions: Locator,
    pickOption: (availableOptions: Locator) => Locator | Promise<Locator>,
  ) {
    await this.openVariantPicker()
    if (!this.isMobileViewport) {
      await combobox.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ block: 'center' })
      })
    }

    const option = await pickOption(availableOptions)
    if (!this.isMobileViewport) {
      // The list scrolls inside its own max height, so an option below the visible rows
      // reads as outside of the viewport until the list is scrolled to it.
      await option.scrollIntoViewIfNeeded({ timeout: 3_000 })
      await expect(option).toBeInViewport({ timeout: 3_000 })
    }
    const testId = await option.getAttribute('data-testid')
    const variantId = testId?.replace(/^variant-option-/, '')

    await this.clickPdpBuyColumnControl(option)

    if (variantId) {
      // URL updates before SFProductActions receives `activeVariant` from the page
      // computed. Add-to-basket short-circuits with no POST until that prop lands.
      await expect(this.page).toHaveURL(new RegExp(`variantId=${variantId}`), {
        timeout: 3_000,
      })
      await expect(this.getVariant(variantId)).toHaveAttribute(
        'aria-selected',
        'true',
      )
    }
  }

  // --- Assertion Methods ---

  /**
   * Asserts the PDP buy-row wishlist control shows "add" state. On narrow viewports the row
   * is not shown (`max-lg:hidden`) but stays in DOM: only `attached` is asserted there.
   */
  async assertAddToWishlistIconVisibility() {
    await this.addToBasketButton
      .first()
      .waitFor({ state: 'attached', timeout: 20_000 })
    await this.buttonAddToWishlist.waitFor({ state: 'attached' })

    if (!this.isMobileViewport) {
      await expect(this.buttonAddToWishlist).toBeVisible()
      await expect(this.buttonRemoveFromWishlist).toBeHidden()
    }
  }

  /**
   * Asserts the PDP buy-row wishlist control shows "remove" state (product is wishlisted).
   */
  async assertRemoveFromWishlistIconVisibility() {
    await this.buttonRemoveFromWishlist.waitFor({ state: 'attached' })

    if (!this.isMobileViewport) {
      await expect(this.buttonRemoveFromWishlist).toBeVisible()
    }
  }
}
