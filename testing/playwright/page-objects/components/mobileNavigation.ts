import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import {
  getCategoryIdFromHref,
  getMainCategoryIdsWithThirdLevel,
  navigateUsingLocatorHref,
} from '../../support/utils'
import { Base } from '../base/base'

/**
 * Page Object Model for the Mobile Navigation (Sidebar/Drawer).
 * Encapsulates locators and methods for interacting with mobile-specific navigation elements,
 * including opening the side navigation, performing searches, and navigating through categories.
 */
export class MobileNavigation extends Base {
  // --- General Mobile Navigation Elements ---
  readonly sideNavigationButton: Locator
  readonly mobileSidebar: Locator
  readonly logoutButton: Locator

  // --- Mobile Search Locators ---
  readonly searchMobileRoot: Locator
  readonly searchInputField: Locator
  readonly searchSuggestionsItem: Locator
  readonly searchDisplayAllResults: Locator
  readonly searchForm: Locator

  // --- Mobile Category Navigation Locators ---
  readonly mobileNavLinkMain: Locator
  readonly mobileNavAccordion: Locator
  readonly mobileNavigationItem: Locator

  /**
   * Initializes the MobileNavigation Page Object.
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    super(page)

    this.sideNavigationButton = page.getByTestId('side-navigation-button')
    this.searchMobileRoot = page.getByTestId('search-mobile')
    this.searchInputField = this.searchMobileRoot.getByTestId(
      'header-search-input',
    )
    this.searchSuggestionsItem = this.searchMobileRoot.getByTestId(
      'search-suggestions-item',
    )
    this.searchDisplayAllResults = this.searchMobileRoot.getByTestId(
      'display-all-results',
    )
    this.searchForm = this.searchMobileRoot.getByTestId('search-form')
    this.mobileSidebar = page.getByTestId('mobile-sidebar')
    this.logoutButton = this.mobileSidebar.getByTestId('logout-button')
    this.mobileNavLinkMain = page.getByTestId('mobile-nav-link-main')
    this.mobileNavAccordion = page.getByTestId('mobile-nav-accordion')
    this.mobileNavigationItem = page.getByTestId('mobile-navigation-item')
  }

  // --- Private Helper Locators & Methods ---

  /**
   * Returns the subcategory drill-down control for a top-level mobile nav row.
   * The category link and this toggle are separate controls on the same row.
   *
   * @param mainCategoryIndex Zero-based index among `mobile-nav-link-main` items.
   */
  getMainCategorySubmenuToggle(mainCategoryIndex: number): Locator {
    return this.mobileNavLinkMain.nth(mainCategoryIndex).getByRole('button')
  }

  /**
   * Reads the categories the top-level rows of the open sidebar link to, in navigation order.
   * Rows that do not point to a plain category, such as the home link or a category link with
   * filters, are left out. A shop without navigation entries gives an empty list.
   * Open the sidebar before calling this method.
   *
   * @param options.withAccordion Only return categories whose sub-navigation shows an
   * accordion. That needs a child with children of its own, so three levels. The navigation
   * payload of the page tells, because the sub-navigation renders only after it opens. When the
   * payload has no readable navigation, rows with a sub-navigation toggle count.
   * @returns The category IDs of the top-level rows.
   */
  async getMainCategoryIds({
    withAccordion = false,
  }: { withAccordion?: boolean } = {}): Promise<number[]> {
    // The rows render after the sidebar opens. Without the wait, a slow render reads as a
    // shop without navigation entries.
    await this.mobileNavLinkMain
      .first()
      .waitFor({ state: 'attached', timeout: 5_000 })
      .catch(() => {})
    const rows = await this.mobileNavLinkMain.evaluateAll((items) =>
      items.map((item) => ({
        href: item.querySelector('a')?.getAttribute('href') ?? null,
        hasSubmenu: item.querySelector('button') != null,
      })),
    )
    const idsWithThirdLevel = withAccordion
      ? await getMainCategoryIdsWithThirdLevel(this.page)
      : undefined

    return rows
      .filter((row) => !withAccordion || idsWithThirdLevel || row.hasSubmenu)
      .map((row) => getCategoryIdFromHref(row.href))
      .filter((id): id is number => id !== undefined)
      .filter((id) => !idsWithThirdLevel || idsWithThirdLevel.has(id))
  }

  /**
   * Returns the position of the top-level row that links to a category.
   * Open the sidebar before calling this method.
   *
   * @param categoryId ID of the main category
   * @returns Zero-based index among `mobile-nav-link-main` rows, usable with `openMainCategorySubmenu`.
   */
  async getMainCategoryIndex(categoryId: number): Promise<number> {
    const hrefs = await this.mobileNavLinkMain.evaluateAll((items) =>
      items.map((item) => item.querySelector('a')?.getAttribute('href')),
    )
    const index = hrefs.findIndex(
      (href) => getCategoryIdFromHref(href ?? null) === categoryId,
    )
    if (index === -1) {
      throw new Error(
        `No top-level mobile navigation row for category ${categoryId}`,
      )
    }
    return index
  }

  /**
   * Opens the Product Listing Page (PLP) of a main category by clicking its row in the open sidebar.
   * Open the sidebar before calling this method.
   *
   * @param categoryId ID of the main category to open
   */
  async navigateToMainCategory(categoryId: number) {
    await this.mobileNavLinkMain
      .locator(`a[href$="-${categoryId}"]`)
      .first()
      .click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Opens the sub-navigation panel for a top-level category that has children.
   *
   * @param mainCategoryIndex Zero-based index among `mobile-nav-link-main` items.
   */
  async openMainCategorySubmenu(mainCategoryIndex: number) {
    await this.mobileNavLinkMain.nth(mainCategoryIndex).waitFor()
    await this.getMainCategorySubmenuToggle(mainCategoryIndex).click()
    await this.page.waitForLoadState('domcontentloaded')
    await this.mobileNavAccordion.first().waitFor()
  }

  /**
   * Returns a Locator for a specific mobile sub-category link based on its visible text.
   * This is a helper method used internally.
   * @param value - The exact text of the sub-category link (e.g., 'Dresses', 'Hoodies').
   * @returns A Playwright Locator for the specific mobile sub-category link.
   */
  private getMobileSubCategory(value: string): Locator {
    return this.page.getByTestId('mobile-navigation-item').getByText(value)
  }

  /**
   * Returns a Locator for a specific mobile navigation accordion item based on its visible text.
   * This is a helper method used internally.
   * @param value - The exact text of the accordion item (e.g., 'Clothing', 'Shoes').
   * @returns A Playwright Locator for the specific mobile navigation accordion.
   */
  private getMobileNavAccordion(value: string): Locator {
    return this.page.getByTestId('mobile-nav-accordion').getByText(value)
  }

  // --- Action Methods ---

  /**
   * Opens the mobile side navigation and waits until the sidebar search field is interactive.
   * Idempotent: does not click the toggle when the sidebar is already open (the button toggles).
   */
  async openMobileSidebar() {
    const isExpanded =
      await this.sideNavigationButton.getAttribute('aria-expanded')
    if (isExpanded !== 'true') {
      await this.sideNavigationButton.click()
    }
    await this.mobileSidebar.waitFor({ state: 'visible' })
    await this.searchInputField.waitFor({ state: 'visible', timeout: 10_000 })
    await expect(this.searchInputField).toBeEditable({ timeout: 10_000 })
  }

  /**
   * Types into the mobile sidebar search field so Vue `v-model` and debounced suggestions update.
   * Uses sequential key input instead of `fill()` because the field sits in a popover drawer and
   * `fill()` often does not sync with Vue on mobile WebKit.
   */
  async fillMobileSearchInput(searchTerm: string) {
    await this.openMobileSidebar()
    await this.searchInputField.click()
    await this.searchInputField.clear()
    await this.searchInputField.pressSequentially(searchTerm, { delay: 25 })
    await expect(this.searchInputField).toHaveValue(searchTerm, {
      timeout: 5_000,
    })
  }

  /**
   * Waits until the mobile search flyout has finished loading suggestions.
   * Does not require "show all results" to be in the viewport (it often sits below
   * the fold in the sidebar when product suggestions fill the flyout).
   */
  private async waitForMobileSearchFlyoutReady() {
    const flyout = this.searchMobileRoot.getByTestId('search-results-flyout')
    await expect(async () => {
      await expect(flyout).toBeAttached()
      await expect(flyout.getByTestId('skeleton')).toHaveCount(0)
    }).toPass({ timeout: 15_000 })
  }

  /**
   * Submits the mobile search form so `resolveSearch` can redirect to PDP or the search page.
   * Waits for suggestions to finish loading, then Enter (same submit path as desktop when no
   * suggestion is keyboard-highlighted).
   */
  async submitMobileSearchForm() {
    await this.searchInputField.focus()
    await this.waitForMobileSearchFlyoutReady()
    await this.searchInputField.press('Enter')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Submits the mobile search via the "show all results" link (stable with Inertia on mobile).
   */
  async submitMobileSearchViaShowAllLink() {
    await this.waitForMobileSearchFlyoutReady()
    await expect(async () => {
      await this.searchDisplayAllResults.scrollIntoViewIfNeeded()
      await expect(this.searchDisplayAllResults).toBeVisible()
      await navigateUsingLocatorHref(this.page, this.searchDisplayAllResults)
    }).toPass({ timeout: 15_000 })
  }

  /**
   * Performs a mobile search by opening the side navigation, filling the search input, and pressing Enter.
   * @param searchTerm - The term to search for.
   */
  async executeSearchMobile(
    searchTerm: string,
    action: 'enter' | 'clickSuggestion' | 'typeOnly' | 'clickMoreResults',
  ) {
    await this.fillMobileSearchInput(searchTerm)

    switch (action) {
      case 'enter':
        await this.submitMobileSearchForm()
        break
      case 'clickSuggestion':
        await this.searchSuggestionsItem.first().waitFor({
          state: 'visible',
          timeout: 15_000,
        })
        await navigateUsingLocatorHref(
          this.page,
          this.searchSuggestionsItem.first(),
        )
        break
      case 'clickMoreResults':
        await this.submitMobileSearchViaShowAllLink()
        break
      case 'typeOnly':
        await this.waitForMobileSearchFlyoutReady()
        break
      default:
        throw new Error(`Unsupported mobile search action: ${action}`)
    }
  }

  /**
   * Navigates to a Product Listing Page (PLP) through the mobile navigation levels:
   * the sub-navigation of a main category, its first accordion, and the first navigation item.
   *
   * @param categoryId ID of the main category whose sub-navigation is used
   */
  async openPlpMobile(categoryId: number) {
    await this.openMobileSidebar()
    await this.openMainCategorySubmenu(
      await this.getMainCategoryIndex(categoryId),
    )
    await this.mobileNavAccordion.nth(0).click()
    await this.mobileNavigationItem.nth(0).click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Signs out via the logout control at the bottom of the mobile sidebar.
   * The button often sits below the fold, so the sidebar is opened, scrolled
   * into view, and clicked via DOM to avoid pointer interception.
   */
  async logoutFromMobileSidebar() {
    await this.openMobileSidebar()
    await this.logoutButton.waitFor({ state: 'attached' })
    await this.logoutButton.scrollIntoViewIfNeeded()
    await this.logoutButton.evaluate((el: HTMLElement) => {
      el.click()
    })
  }
}
