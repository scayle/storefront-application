import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { Base } from '../base/base'

/**
 * Page Object Model for Toast/Info Messages.
 * Encapsulates locators and methods for interacting with and asserting the state of
 * transient information or success messages displayed to the user (e.g., after an action).
 */
export class ToastMessage extends Base {
  // --- Toast Message Locators ---
  readonly toastInfo: Locator
  readonly toastInfoButton: Locator

  /**
   * Initializes the ToastMessage Page Object.
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    super(page)

    this.toastInfo = page.getByTestId('toast-info')
    this.toastInfoButton = page.getByTestId('toast-info-button')
  }

  // --- Action Methods ---

  // --- Assertion Methods ---

  /**
   * Asserts that the toast information message is visible on the page.
   */
  async assertToastInfoIsVisible() {
    await expect(this.toastInfo.first()).toBeVisible({ timeout: 10000 })
  }
}
