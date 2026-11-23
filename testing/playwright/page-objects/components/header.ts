import type { Locator, Page } from '@playwright/test'
import { Base } from '../base/base'

/**
 * Page Object Model for the website Header component.
 * Encapsulates locators and methods for interacting with and asserting states of
 * common header elements like navigation buttons, user login, basket, and wishlist counters.
 */
export class Header extends Base {
  // --- Main Header Elements ---
  /** Locator for the main header container. */
  readonly mainHeader: Locator

  // --- Navigation Buttons ---
  readonly headerBasketButton: Locator
  readonly headerLoginButton: Locator
  readonly headerLoginButtonMobile: Locator
  readonly wishlistLink: Locator
  readonly promotionsButton: Locator
  readonly backToShopButton: Locator

  // --- Counter Badges ---
  readonly wishlistNumItems: Locator
  readonly basketNumItems: Locator

  // --- User Profile Flyout (desktop hover popover) ---
  /** Popover container for the user flyout. Only in DOM when flyout is open. */
  readonly userFlyoutPopover: Locator
  /** Login (Sign In) link in the user flyout when not logged in. */
  readonly userFlyoutLoginLink: Locator
  /** Register link in the user flyout when not logged in. */
  readonly userFlyoutRegisterLink: Locator
  /** Greeting with user first name in the user flyout when logged in. */
  readonly userFlyoutGreetingFirstname: Locator
  /** Link to account profile in the user flyout when logged in. */
  readonly userFlyoutProfileLink: Locator
  /** Link to account orders in the user flyout when logged in. */
  readonly userFlyoutOrdersLink: Locator
  /** Link to account subscriptions in the user flyout when logged in. */
  readonly userFlyoutSubscriptionsLink: Locator
  /** Logout button in the user flyout when logged in. */
  readonly userFlyoutLogoutButton: Locator

  /**
   * Initializes the Header Page Object.
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    super(page)

    this.wishlistNumItems = page.getByTestId('header-wishlist-count')
    this.headerBasketButton = page.getByTestId('basket-link')
    this.headerLoginButton = page.getByTestId('header-user-button')
    this.headerLoginButtonMobile = page.getByTestId('header-user-button-mobile')
    this.basketNumItems = page.getByTestId('header-basket-count')
    this.wishlistLink = page.getByTestId('wishlist-link')
    this.mainHeader = page.getByTestId('header')
    this.promotionsButton = page.getByTestId('promotion-header-button')
    this.backToShopButton = page.getByTestId('back-to-shop-button')

    const userPopoverContainer = page
      .getByTestId('popoverContainer')
      .filter({ has: page.getByTestId('header-user-button') })
    this.userFlyoutPopover = userPopoverContainer
    this.userFlyoutLoginLink = userPopoverContainer.getByTestId(
      'account-popover-login-button',
    )
    this.userFlyoutRegisterLink = userPopoverContainer.getByTestId(
      'account-popover-register-button',
    )
    this.userFlyoutGreetingFirstname = userPopoverContainer.getByTestId(
      'account-popover-name',
    )
    this.userFlyoutProfileLink = userPopoverContainer.getByTestId(
      'account-popover-link-profile',
    )
    this.userFlyoutOrdersLink = userPopoverContainer.getByTestId(
      'account-popover-link-orders',
    )
    this.userFlyoutSubscriptionsLink = userPopoverContainer.getByTestId(
      'user-flyout-subscriptions-link',
    )
    this.userFlyoutLogoutButton = userPopoverContainer.getByTestId(
      'account-popover-logout-button',
    )
  }

  // --- Action Methods ---

  /**
   * Clicks the basket button in the header to navigate to the Basket page.
   * Waits for the page to load content.
   */
  async visitBasketPage() {
    await this.headerBasketButton.first().click()
    await this.page.waitForLoadState('domcontentloaded')
  }
}
