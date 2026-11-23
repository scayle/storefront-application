import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { navigateUsingLocatorHref } from '../../support/utils'
import { Base } from '../base/base'

/**
 * Page Object Model for the Search functionality.
 * Encapsulates locators and methods for interacting with search inputs,
 * managing search results, and verifying search suggestions and pages.
 */
export class Search extends Base {
  // --- Search Input & Form Locators ---
  /**
   * Locator for the main search input field (e.g., in the header or a flyout).
   * @note Two `SFSearchField` instances exist (see `search-mobile` and `search-desktop`). Use the scoped
   * root for the viewport so flyout actions target the same suggestion state as the filled input.
   */
  readonly searchInputMobile: Locator
  readonly searchInputDesktop: Locator
  /** Header desktop search field container (`data-testid="search-desktop"`). */
  readonly searchDesktopRoot: Locator
  /** Mobile sidebar search field container (`data-testid="search-mobile"`). */
  readonly searchMobileRoot: Locator
  readonly searchForm: Locator
  readonly searchResetButton: Locator

  // --- Search Results & Flyout Locators ---
  readonly searchResultsFlyout: Locator
  readonly searchResultsProductImage: Locator
  readonly searchResultsHeadline: Locator
  readonly searchDisplayAllResults: Locator
  readonly h1: Locator

  // --- Search Suggestions Locators ---
  readonly searchSuggestionsTag: Locator

  /**
   * Initializes the Search Page Object.
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    super(page)

    this.searchMobileRoot = page.getByTestId('search-mobile')
    this.searchDesktopRoot = page.getByTestId('search-desktop')
    this.searchInputMobile = this.searchMobileRoot.getByTestId(
      'header-search-input',
    )
    this.searchInputDesktop = this.searchDesktopRoot.getByTestId(
      'header-search-input',
    )
    this.searchResultsFlyout = page.getByTestId('search-results-flyout')
    this.searchResultsProductImage = page.getByTestId('product-image')
    this.searchResultsHeadline = page.getByTestId('search-results-headline')
    this.searchDisplayAllResults = this.searchDesktopRoot.getByTestId(
      'display-all-results',
    )
    this.searchForm = page.getByTestId('search-form')
    this.searchResetButton = page.getByTestId('search-reset-button')
    this.h1 = page.locator('h1')
    this.searchSuggestionsTag = page.getByTestId(/^search-suggestion-tag-\d+$/)
  }

  // --- Getter functions ---

  /**
   * Getter for the "search" input, handles mobile and desktop viewports.
   */
  public get searchInput(): Locator {
    return this.isMobileViewport
      ? this.searchInputMobile
      : this.searchInputDesktop
  }

  /**
   * Returns the filter-tag group on category suggestions for the active search field.
   * The group is not present until suggestions load — callers should
   * `.waitFor()` or `expect(...).toBeVisible()` before interacting.
   */
  public get searchSuggestionsTagGroup(): Locator {
    const root = this.isMobileViewport
      ? this.searchMobileRoot
      : this.searchDesktopRoot
    return root.getByTestId('search-suggestion-tag-group')
  }

  /**
   * Returns the category suggestion link that contains the first filter-tag group.
   */
  firstTaggedSearchSuggestion(): Locator {
    return this.searchSuggestionsTagGroup
      .first()
      .locator('xpath=ancestor::*[@data-testid="search-suggestions-item"][1]')
  }

  // --- Action Methods ---

  /**
   * Executes a search by filling the input field and pressing Enter.
   * @param searchTerm - The term to search for.
   */
  async executeSearchDesktop(
    searchTerm: string,
    action: 'enter' | 'clickSuggestion' | 'typeOnly' | 'clickMoreResults',
  ) {
    await this.searchInput.click({ force: true })
    await this.searchInput.fill(searchTerm)

    switch (action) {
      case 'enter': {
        await this.page.waitForResponse(
          new URL('/api/search/getSuggestions', this.page.url()).toString(),
        )
        await this.searchInput.press('Enter')
        break
      }
      case 'clickSuggestion': {
        const suggestion = this.searchDesktopRoot
          .getByTestId('search-suggestions-item')
          .first()
        await suggestion.waitFor()
        await suggestion.click({ force: true })
        break
      }
      case 'clickMoreResults':
        await navigateUsingLocatorHref(this.page, this.searchDisplayAllResults)
        break
      case 'typeOnly':
        await this.searchDesktopRoot
          .getByTestId('search-results-flyout')
          .waitFor({ state: 'visible', timeout: 15_000 })
        break
      default:
        throw new Error(`Unsupported desktop search action: ${action}`)
    }
  }

  // --- Assertion Methods ---

  /**
   * Asserts that the search results headline contains the specified search term.
   * @param searchTerm - The term expected to be present in the headline.
   */
  async assertHeadlineSearchResults(searchTerm: string) {
    await expect(this.searchResultsHeadline.first()).toContainText(searchTerm)
  }
}
