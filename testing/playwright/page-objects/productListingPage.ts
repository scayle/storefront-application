import type { Locator, Page } from '@playwright/test'
import { Base } from './base/base'

/**
 * Page Object Model for the Product Listing Page (PLP).
 * Encapsulates locators and methods for interacting with and asserting states on
 * product listing pages, including product cards, wishlist actions, filters, and sorting.
 */
export class ProductListingPage extends Base {
  // --- Product Card & Item Locators ---
  readonly productCard: Locator
  readonly productItem: Locator
  readonly productImage: Locator
  readonly productTile: Locator
  readonly productSibling: Locator
  readonly siblingsOverlay: Locator

  // --- Wishlist Action Locators ---
  readonly wishlistButton: Locator
  readonly removeFromWishlistButton: Locator

  // --- Navigation & Page Structure Locators ---
  readonly menuRootCategory: Locator
  readonly menuSubCategory: Locator
  readonly h1: Locator
  readonly pageTitle: Locator
  readonly sideNavigation: Locator
  readonly backButton: Locator
  readonly scrollToTopButton: Locator

  // --- Empty State Locators ---
  readonly noResults: Locator
  readonly resetFiltersButton: Locator

  /**
   * Initializes the ProductListingPage Page Object.
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    super(page)

    this.wishlistButton = page.locator(
      '[data-testid="add-item-to-wishlist-button"]',
    )
    this.productTile = page.locator('[id^="product-"]')
    this.menuRootCategory = page.getByTestId('root-category-0')
    this.menuSubCategory = page.getByTestId('sub-category-0')
    this.productItem = page.getByTestId('product-item')
    this.removeFromWishlistButton = page.getByTestId(
      'remove-item-from-wishlist-button',
    )
    this.productSibling = page.getByTestId('product-sibling')
    this.siblingsOverlay = page.getByTestId('siblings-overlay')
    this.productImage = page.getByTestId('product-image')
    this.productCard = page.locator('article[id^="product-"]')
    this.h1 = page.locator('h1')
    this.pageTitle = page.getByTestId('active-category-breadcrumb')
    this.sideNavigation = page.getByTestId('side-navigation')
    this.backButton = page.getByTestId('plp-back-button')
    this.scrollToTopButton = page.getByTestId('scroll-to-top-button')
    this.noResults = page.getByTestId('plp-no-results')
    this.resetFiltersButton = page.getByTestId('plp-reset-filters-button')
  }

  // --- Action Methods ---

  /**
   * Adds the first product on the PLP to the wishlist.
   * Assumes the wishlist button for the first product is present and clickable.
   */
  async addProductToWishlist() {
    await this.wishlistButton.first().click()
  }

  /**
   * Removes the first product from the wishlist from the PLP (if already added).
   * Assumes the remove button for the first product is present and clickable.
   */
  async removeProductFromWishlist() {
    await this.removeFromWishlistButton.first().click()
  }

  /**
   * Navigates to the current PLP URL with additional filter parameters applied as a deeplink.
   * Query parameters already in the URL, such as a sorting, are kept.
   * @param filters - An object where keys are filter names and values are filter values (e.g., `{ maxPrice: 10000 }`).
   */
  async addFiltersToPLP(
    filters: Record<string, string | boolean | number> = {},
  ) {
    const url = new URL(this.page.url())
    for (const [key, value] of Object.entries(filters)) {
      url.searchParams.set(`filters[${key}]`, String(value))
    }

    await this.navigate(this.page, url.toString(), 'networkidle')
  }

  /**
   * Returns the product card locator for a given product ID.
   * Use this to scope slider actions (arrows, swipe) to a specific card.
   * Matches either data-testid (article-{productId}) or id (product-{productId}) so
   * the test works across template versions and avoids timeouts when one attribute is missing.
   *
   * @param productId The product ID
   * @returns Locator for the product card
   */
  getProductCardById(productId: number): Locator {
    return this.page
      .locator(
        `[data-testid="article-${productId}"], [id="product-${productId}"]`,
      )
      .first()
  }

  /**
   * Returns the image strip root inside a product card (`SFImageStrip`).
   *
   * @param card Locator for the product card (e.g. from getProductCardById)
   */
  getProductCardImageSlider(card: Locator): Locator {
    return card.getByTestId('image-strip')
  }

  /**
   * Returns prev/next arrow locators for a product card image strip (desktop, non-touch).
   *
   * @param card Locator for the product card
   */
  getProductCardImageSliderPrevButton(card: Locator): Locator {
    return this.getProductCardImageSlider(card).getByTestId(
      'image-strip-prev-button',
    )
  }

  getProductCardImageSliderNextButton(card: Locator): Locator {
    return this.getProductCardImageSlider(card).getByTestId(
      'image-strip-next-button',
    )
  }

  /**
   * Returns the scrollable slide list inside a product card image strip.
   * Use for swipe gestures on mobile (e.g. evaluate scrollTo to simulate swipe).
   *
   * @param card Locator for the product card (e.g. from getProductCardById)
   */
  getProductCardImageSliderScrollable(card: Locator): Locator {
    return this.getProductCardImageSlider(card).locator('ul').first()
  }

  /**
   * Returns the siblings overlay inside a product card (`SFProductCard`).
   *
   * @param card Locator for the product card (e.g. from getProductCardById)
   */
  getProductCardSiblingsOverlay(card: Locator): Locator {
    return card.getByTestId('siblings-overlay')
  }

  /**
   * Returns sibling link locators inside a product card (`SFProductCardSiblingsPicker`).
   *
   * @param card Locator for the product card (e.g. from getProductCardById)
   */
  getProductCardSiblings(card: Locator): Locator {
    return card.getByTestId('product-sibling')
  }

  /**
   * Returns the number of product cards in the first row of the PLP grid.
   * Products in the same row share approximately the same getBoundingClientRect().top.
   * Call after the product list has rendered and the viewport is set to the desired size.
   *
   * @returns The number of product items in the first row
   */
  async getProductCountInFirstRow(): Promise<number> {
    return await this.productItem.evaluateAll((elements) => {
      if (elements.length === 0) {
        return 0
      }
      const tops = elements.map((el) => el.getBoundingClientRect().top)
      const firstRowTop = tops[0]
      const epsilon = 10
      return tops.filter((top) => Math.abs(top - firstRowTop) <= epsilon).length
    })
  }
}
