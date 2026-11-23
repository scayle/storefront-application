import type { Locator, Page } from '@playwright/test'
import { Base } from '../base/base'

/**
 * Page Object Model for the Sorting component on Product Listing Pages (PLP).
 * Encapsulates locators and methods for interacting with sorting controls
 * for both desktop (dropdown) and mobile (slider/chips) views.
 */
export class Sorting extends Base {
  // --- General Sorting Controls (e.g., Desktop Dropdown) ---
  readonly sortDropdown: Locator

  // --- Mobile-Specific Sorting Locators ---
  readonly mobileSortWrapper: Locator

  /**
   * Initializes the Sorting Page Object.
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    super(page)

    this.sortDropdown = page.getByTestId('sort-dropdown')
    this.mobileSortWrapper = page.getByTestId('mobile-sort-wrapper')
  }

  // --- Action Methods ---

  /**
   * Applies a sorting option on desktop by opening the sort dropdown and choosing an option.
   * Options are scoped to the same dropdown instance so clicks do not hit hidden panels
   * (`v-show`) or the wrong control during Inertia updates. The option click uses `force`
   * so the open animation does not fail Playwright's stability check.
   *
   * @param sortingOption - The sorting parameter (e.g., 'price_asc', 'price_desc').
   * @param index - The index of the sort dropdown if multiple exist (0 for desktop PLP).
   */
  async applySortingDesktop(sortingOption: string, index: number) {
    const dropdown = this.sortDropdown.nth(index)
    await dropdown.click()

    const listbox = dropdown.locator('[role="listbox"]')
    await listbox.waitFor({ state: 'visible', timeout: 10_000 })

    const option = dropdown.getByTestId(`sort-item-${sortingOption}`)
    await option.waitFor({ state: 'visible', timeout: 10_000 })
    await option.scrollIntoViewIfNeeded()
    await option.click({ force: true })

    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Applies a sorting option on mobile devices by clicking the specific sorting chip/link within the slider.
   * @param sortingOption - The sorting parameter (e.g., 'price_desc', 'price_desc').
   */
  async applySortingMobile(sortingOption: string) {
    const specificSortingLinkLocator = this.mobileSortWrapper.getByTestId(
      `mobile-sort-item-${sortingOption}`,
    )

    await specificSortingLinkLocator.waitFor({ state: 'visible' })
    await specificSortingLinkLocator.click()
    await this.page.waitForLoadState('domcontentloaded')
  }
}
