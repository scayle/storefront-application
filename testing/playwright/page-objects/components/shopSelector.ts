import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { navigateUsingLocatorHref } from '../../support/utils'
import { Base } from '../base/base'

/**
 * Page Object Model for the Shop Selector component.
 * Encapsulates locators and methods for interacting with the shop/country switcher,
 * verifying its states, and asserting shop changes.
 */
export class ShopSelector extends Base {
  // --- Core Shop Selector Elements ---
  readonly headerShopSelectorRoot: Locator
  readonly sidebarShopSelectorRoot: Locator
  readonly headerShopSelectorListbox: Locator
  readonly sidebarShopSelectorListbox: Locator
  readonly shopSelectorList: Locator
  readonly shopLanguageItem: Locator
  readonly shopLanguageItemCurrent: Locator

  // --- Current Shop/Country Display Locators ---
  readonly currentShop: Locator
  readonly currentShopMobile: Locator
  readonly currentCountry: Locator

  // --- Country/Region Selection Locators ---
  readonly country: Locator

  /**
   * Initializes the ShopSelector Page Object.
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    super(page)

    this.headerShopSelectorRoot = page.getByTestId('shop-switcher-header')
    this.sidebarShopSelectorRoot = page.getByTestId('shop-switcher-sidebar')
    this.headerShopSelectorListbox =
      this.headerShopSelectorRoot.getByTestId('language-listbox')
    this.sidebarShopSelectorListbox =
      this.sidebarShopSelectorRoot.getByTestId('language-listbox')
    this.currentShop = page.getByTestId('shop-switcher-current-shop')
    this.shopLanguageItem = page.getByTestId('shop-language-item')
    this.shopLanguageItemCurrent = page.getByTestId(
      'shop-language-item-current',
    )
    this.shopSelectorList = page.getByTestId('shop-selector-list')
    this.currentShopMobile = page.getByTestId(
      'shop-switcher-current-shop-mobile',
    )
    this.currentCountry = page.getByTestId('shop-selector-current-country')
    this.country = page.getByTestId('shop-selector-country')
  }

  // --- Private helpers ---

  /**
   * Shop switcher root for the active viewport: header on desktop, sidebar on mobile.
   */
  private getShopSwitcherRoot(): Locator {
    return this.isMobileViewport
      ? this.sidebarShopSelectorRoot
      : this.headerShopSelectorRoot
  }

  /**
   * Shop switcher trigger for the active viewport.
   */
  private getActiveListbox(): Locator {
    return this.isMobileViewport
      ? this.sidebarShopSelectorListbox
      : this.headerShopSelectorListbox
  }

  /**
   * Scrollable flyout body for the open shop switcher dialog.
   */
  private getShopSwitcherFlyoutBody(): Locator {
    return this.getShopSwitcherSlideIn().getByTestId('slide-in-overflow')
  }

  /**
   * The shop switcher dialog. The header and sidebar triggers share one dialog,
   * which the overlay host renders outside both of them on its first open.
   */
  private getShopSwitcherSlideIn(): Locator {
    return this.page.getByTestId('shop-switcher-slide-in')
  }

  /**
   * Checks whether the shop selector is part of the page for the active viewport.
   * The storefront leaves it out when the current shop is the only shop, because
   * there is nothing to switch to.
   * On mobile, open the sidebar before calling this method.
   *
   * @returns `true` when the shop selector is in the DOM.
   */
  async isRendered(): Promise<boolean> {
    return (await this.getShopSwitcherRoot().count()) > 0
  }

  // --- Action Methods ---

  /**
   * Opens the shop selector dropdown/listbox for the active viewport.
   * On mobile, open the sidebar before calling this method.
   */
  async openShopSelector() {
    const listbox = this.getActiveListbox()
    await listbox.scrollIntoViewIfNeeded()

    await expect(async () => {
      if ((await listbox.getAttribute('aria-expanded')) !== 'true') {
        await listbox.evaluate((el: HTMLElement) => {
          el.click()
        })
      }
      await expect(listbox).toHaveAttribute('aria-expanded', 'true')
    }).toPass({ timeout: 10_000 })

    await expect(
      this.getShopSwitcherFlyoutBody().getByTestId(
        'shop-selector-current-country',
      ),
    ).toBeAttached({ timeout: 10_000 })
  }

  /**
   * Counts the countries in the open flyout that the shop selector can switch to.
   * The current country is not counted. Returns 0 for a shop with a single country.
   * Assumes the shop selector is already open.
   *
   * @returns The number of other countries listed in the flyout.
   */
  async getSwitchTargetCount(): Promise<number> {
    const countries = this.getShopSwitcherFlyoutBody().getByTestId(
      'shop-selector-country',
    )
    // The flyout renders the current country first, so an immediate count can read 0 on a
    // shop that has other countries. A shop with a single country waits out the timeout.
    await countries
      .first()
      .waitFor({ state: 'attached', timeout: 2_000 })
      .catch(() => {})
    return countries.count()
  }

  /**
   * Selects the first available country in the shop selector list to switch shops.
   * Assumes the shop selector is already open.
   */
  async clickSwitchShop() {
    const countryLink = this.getShopSwitcherFlyoutBody()
      .getByTestId('shop-selector-country')
      .first()
    await navigateUsingLocatorHref(this.page, countryLink)
  }

  /**
   * Asserts the currently selected country is rendered as non-interactive text,
   * not as a navigable link or button.
   */
  async assertCurrentCountryIsNotClickable() {
    const currentCountry = this.getShopSwitcherFlyoutBody()
      .getByTestId('shop-selector-current-country')
      .first()

    await expect(currentCountry).toBeVisible()
    await expect(currentCountry).toHaveAttribute('aria-current', 'true')
    await expect(currentCountry).not.toHaveRole('link')
    await expect(currentCountry).not.toHaveRole('button')
  }

  /**
   * Clicks the current country entry in the open shop selector flyout.
   * Used to verify that the interaction does not navigate or close the flyout.
   */
  async clickCurrentCountry() {
    await this.getShopSwitcherFlyoutBody()
      .getByTestId('shop-selector-current-country')
      .first()
      .click()
  }

  /**
   * Asserts the shop selector flyout is still open.
   */
  async assertShopSelectorIsOpen() {
    await expect(this.getActiveListbox()).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    await expect(this.getShopSwitcherSlideIn()).toBeVisible()
  }

  // --- Assertion Methods ---

  /**
   * Asserts the visibility and initial state of the shop selector for the active viewport.
   * On mobile, open the sidebar before calling this method.
   */
  async assertShopSelectorIsVisible() {
    const listbox = this.getActiveListbox()
    await listbox.scrollIntoViewIfNeeded()
    await listbox.waitFor({ state: 'visible' })
    await expect(listbox.getByTestId('shop-switcher-globe-icon')).toBeVisible()
    await expect(listbox).toHaveAttribute('aria-expanded', 'false')
  }

  /**
   * Asserts that the current page URL has changed, indicating a successful shop switch.
   * @param initialUrl - The URL of the page before attempting the shop switch.
   */
  async assertUrlHasChanged(initialUrl: string) {
    await expect(async () => {
      await this.page.waitForLoadState('domcontentloaded')
      expect(this.page.url()).not.toEqual(initialUrl)
    }).toPass({ timeout: 15_000 })
  }

  /**
   * Asserts that the current page URL has not changed, indicating that no shop switch occurred.
   * @param initialUrl - The URL of the page before attempting the shop switch.
   */
  async assertUrlHasNotChanged(initialUrl: string) {
    await expect(async () => {
      await this.page.waitForLoadState('domcontentloaded')
      expect(this.page.url()).toEqual(initialUrl)
    }).toPass({ timeout: 5_000 })
  }
}
