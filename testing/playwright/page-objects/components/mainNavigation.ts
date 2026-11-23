import type { Locator, Page } from '@playwright/test'
import {
  getCategoryIdFromHref,
  navigateUsingLocatorHref,
} from '../../support/utils'
import { Base } from '../base/base'

/**
 * Page Object Model for the Main Navigation component for desktop browsers.
 * Encapsulates locators and methods for interacting with the main navigation links,
 * opening the desktop flyout, and navigating to Product Listing Pages (PLPs).
 */
export class MainNavigation extends Base {
  // --- Main Navigation Locators ---
  readonly desktopNavigationFlyout: Locator
  readonly navigationItem: Locator
  readonly navigationLinkMain: Locator

  /**
   * Initializes the MainNavigation Page Object.
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    super(page)

    this.desktopNavigationFlyout = page
      .getByTestId('desktop-navigation-flyout')
      .filter({ visible: true })
      .first()
    this.navigationItem = page.getByTestId('navigation-item')
    this.navigationLinkMain = page.getByTestId('nav-link-main')
  }

  // --- Private Helper Locators & Methods ---

  /**
   * Returns a Locator for a specific main category link based on its data-testid suffix.
   * This is a helper method used internally.
   * @param categoryTestId - The specific part of the data-testid (e.g., 'women', 'men').
   * @returns Playwright locator for the specific main category link.
   */
  private getMainCategory(categoryTestId: string): Locator {
    return this.page.getByTestId(`nav-link-${categoryTestId}`)
  }

  /**
   * Returns a Locator for a specific sub-category link based on its visible text.
   * This is a helper method used internally.
   * @param value - The exact text of the sub-category link (e.g., 'Dresses', 'Hoodies').
   * @returns A Playwright Locator for the specific sub-category link.
   */
  private getSubCategory(value: string): Locator {
    return this.page.getByTestId('navigation-item').getByText(value)
  }

  /**
   * Returns the main navigation link of a category.
   * Category links end with the category ID, for example `/de/c/women-56992`.
   *
   * @param categoryId ID of the category the link points to
   */
  private getMainLinkForCategory(categoryId: number): Locator {
    return this.navigationLinkMain
      .and(this.page.locator(`[href$="-${categoryId}"]`))
      .first()
  }

  /**
   * Returns the flyout panel that belongs to a main navigation link.
   * Each top-level item owns its own flyout in the DOM.
   *
   * @param mainLink Locator of the main navigation link
   */
  private flyoutForMainLink(mainLink: Locator): Locator {
    return mainLink
      .locator('xpath=ancestor::li[1]')
      .getByTestId('desktop-navigation-flyout')
  }

  // --- Action Methods ---

  /**
   * Reads the categories the main navigation links to, in navigation order.
   * Links that do not point to a plain category, such as the home link or a category link
   * with filters, are left out. A shop without navigation entries gives an empty list.
   *
   * @param options.withFlyout Only return categories whose flyout lists at least one category link.
   * @returns The category IDs of the main navigation links.
   */
  async getMainCategoryIds({
    withFlyout = false,
  }: { withFlyout?: boolean } = {}): Promise<number[]> {
    await this.page.getByTestId('nav-categories').waitFor({ state: 'attached' })
    const entries = await this.navigationLinkMain.evaluateAll((links) =>
      links.map((link) => ({
        href: link.getAttribute('href'),
        hasFlyout:
          link
            .closest('li')
            ?.querySelector(
              '[data-testid="desktop-navigation-flyout"] a[href*="/c/"]',
            ) != null,
      })),
    )

    return entries
      .filter((entry) => !withFlyout || entry.hasFlyout)
      .map((entry) => getCategoryIdFromHref(entry.href))
      .filter((id): id is number => id !== undefined)
  }

  /**
   * Opens the main desktop navigation overlay/flyout of a category by hovering its main link.
   *
   * @param categoryId ID of the main category whose flyout opens
   */
  async openMainNavigationOverlay(categoryId: number) {
    const mainLink = this.getMainLinkForCategory(categoryId)
    await mainLink.waitFor()
    await mainLink.hover()
    await this.flyoutForMainLink(mainLink).waitFor({ state: 'visible' })
  }

  /**
   * Navigates to a main category Product Listing Page (PLP) directly from the main navigation.
   *
   * @param categoryId ID of the main category to open. Without it, the second main
   * navigation link (`.nth(1)`) is clicked, which skips the "Home" link. Keep the
   * fallback for specs that call it without an id.
   */
  async navigateToPlpMainCategory(categoryId?: number) {
    const mainLink =
      categoryId === undefined
        ? this.navigationLinkMain.nth(1)
        : this.getMainLinkForCategory(categoryId)
    await mainLink.click()
    await this.page.mouse.move(0, 0)
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigates to a sub-category Product Listing Page (PLP) from the main navigation flyout.
   * Hovers the main category and clicks the first category link in its flyout.
   *
   * @param categoryId ID of the main category whose flyout is used
   */
  async navigateToPlpSubCategory(categoryId: number) {
    const mainLink = this.getMainLinkForCategory(categoryId)
    await mainLink.waitFor()
    await mainLink.hover()
    const flyout = this.flyoutForMainLink(mainLink)
    await flyout.waitFor({ state: 'visible' })
    const subCategoryLink = flyout.locator('a[href*="/c/"]').first()
    await navigateUsingLocatorHref(this.page, subCategoryLink)
    await this.page.waitForLoadState('domcontentloaded')
  }
}
