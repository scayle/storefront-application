import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { Base } from './base/base'
import { navigateUsingLocatorHref } from '../support/utils'

/**
 * Page Object Model for the User Account Area.
 * Encapsulates locators and methods for interacting with and asserting states on user profile,
 * personal information, and password management sections within the account area.
 */
export class AccountPage extends Base {
  // --- Profile & Personal Information Locators ---
  readonly userFirstName: Locator
  readonly userLastName: Locator
  readonly userBirthDate: Locator
  readonly genderSelection: Locator
  readonly birthdateValidationLabel: Locator
  readonly formSaveButton: Locator

  // --- Password Management Locators ---
  readonly passwordCurrent: Locator
  readonly passwordNew: Locator
  readonly passwordErrorMessage: Locator
  readonly passwordUpdateButton: Locator

  // --- Account Tab Navigation Locators ---
  readonly accountSideMenu: Locator
  readonly accountTabOrders: Locator
  readonly accountTabSubscriptions: Locator
  readonly accountTabProfile: Locator

  // --- Headline/Section Locators ---
  readonly userProfileHeadline: Locator
  readonly accountInfoHeadline: Locator
  readonly personalInfoHeadline: Locator
  readonly passwordHeadline: Locator

  // --- Internal/Helper Locators ---
  private readonly sectionBirthdate: Locator
  private readonly passwordUpdateForm: Locator

  /**
   * Initializes the AccountPage Page Object.
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    super(page)

    this.userFirstName = page.getByTestId('user-first-name')
    this.userLastName = page.getByTestId('user-last-name')
    this.userBirthDate = page.getByTestId('user-birthdate')
    this.formSaveButton = page.getByTestId('personal-info-submit')
    this.passwordUpdateForm = page.getByTestId('password-update-form')
    this.passwordCurrent =
      this.passwordUpdateForm.getByTestId('current-password')
    this.passwordNew = this.passwordUpdateForm.getByTestId('new-password')
    this.passwordUpdateButton = page.getByTestId('password-submit')
    this.sectionBirthdate = page.getByTestId('section-birthdate')
    this.birthdateValidationLabel = this.sectionBirthdate.getByTestId(
      'validation-error-text',
    )
    this.accountSideMenu = page.getByTestId('account-side-menu')
    this.accountTabOrders = this.accountMenuItem(0)
    this.accountTabSubscriptions = this.accountMenuItem(1)
    this.accountTabProfile = this.accountMenuItem(2)
    // Prefer role="alert" (inner banner) over data-testid on the transition wrapper — mobile visibility is reliable on the alert node.
    this.passwordErrorMessage = this.passwordUpdateForm.getByRole('alert')
    this.userProfileHeadline = page.getByTestId('profile-headline')
    this.accountInfoHeadline = page.getByTestId(
      'profile-account-information-headline',
    )
    this.personalInfoHeadline = page.getByTestId(
      'profile-personal-information-headline',
    )
    this.passwordHeadline = page.getByTestId('profile-password-headline')
    this.genderSelection = page.getByTestId('gender-selection')
  }

  /**
   * Returns the account navigation item for the active viewport.
   * Desktop uses the side menu (`account-side-menu-item-*`), mobile uses chip tabs (`account-area-tab-*`).
   *
   * @param index - Zero-based menu index: 0 orders, 1 subscriptions, 2 profile.
   */
  private accountMenuItem(index: number): Locator {
    const testId = this.isMobileViewport
      ? `account-area-tab-${index}`
      : `account-side-menu-item-${index}`

    return this.page.getByTestId(testId)
  }

  /**
   * Opens an account area tab via its rendered `href`.
   * Inertia client visits from a Playwright click are flaky in E2E, so this follows the link URL directly.
   *
   * @param menuItem - Orders, subscriptions, or profile tab locator.
   */
  async openAccountTab(menuItem: Locator) {
    await menuItem.scrollIntoViewIfNeeded()
    await navigateUsingLocatorHref(this.page, menuItem)
  }

  /**
   * Handles both correct and incorrect birth date formats by simulating sequential typing.
   * @param firstName - The new first name for the user.
   * @param lastName - The new last name for the user.
   * @param birthDate - The birth date string (e.g., "YYYY-MM-DD", or an invalid format for testing validation).
   * @param clickSaveButton - True to click the save button after filling fields, false otherwise.
   */
  async updateUserData(
    firstName: string,
    lastName: string,
    birthDate: string,
    clickSaveButton: boolean,
  ) {
    const userFields = [
      { field: this.userFirstName, value: firstName },
      { field: this.userLastName, value: lastName },
    ]

    for (const { field, value } of userFields) {
      await field.waitFor()
      await field.clear()
      await field.fill(value)
    }

    await this.userBirthDate.waitFor()
    await this.userBirthDate.clear()
    await this.userBirthDate.fill(birthDate)
    await this.userBirthDate.press('Tab')
    await this.page.waitForLoadState('domcontentloaded')

    if (clickSaveButton === true) {
      await expect(this.formSaveButton).toBeEnabled({ timeout: 15_000 })
      await this.formSaveButton.click()
    }
  }

  /**
   * Asserts invalid personal info keeps save disabled and does not show a success toast.
   * Submit uses native `disabled` and `aria-disabled` when Regle reports errors, so
   * Playwright cannot click it with the default action.
   */
  async assertPersonalInfoSaveBlocked() {
    await expect(this.birthdateValidationLabel).toBeVisible()
    await expect(this.formSaveButton).toHaveAttribute('aria-disabled', 'true')
    await expect(this.page.getByTestId('toast-info')).toBeHidden()
  }

  /**
   * Updates the user's password in the profile section.
   * @param currentPassword - The user's current password.
   * @param newPassword - The new password to set.
   * @param clickUpdateButton - True to click the update button after filling fields, false otherwise.
   */
  async updatePassword(
    currentPassword: string,
    newPassword: string,
    clickUpdateButton: boolean,
  ) {
    await this.passwordHeadline.waitFor({ state: 'visible' })
    await this.passwordHeadline.scrollIntoViewIfNeeded()
    await this.passwordUpdateForm.waitFor({ state: 'visible' })
    // Vue: prior submit keeps `isUpdating` until RPC completes (`loading` → animate-pulse on submit).
    // `toBeEditable` is unreliable here: Chromium can also leave password inputs readOnly until/unless we clear it.
    await expect(this.passwordUpdateButton).not.toHaveClass(/animate-pulse/, {
      timeout: 45_000,
    })

    const passwordFields = [
      { field: this.passwordCurrent, value: currentPassword },
      { field: this.passwordNew, value: newPassword },
    ]

    for (const { field, value } of passwordFields) {
      await field.scrollIntoViewIfNeeded()
      await field.waitFor({ state: 'visible' })
      // Force avoids long timeouts when a toast, flyout, or sticky chrome occludes the hit target.
      await field.click({ force: true })
      await field.evaluate((el: HTMLInputElement) => {
        el.removeAttribute('readonly')
        el.readOnly = false
      })
      await field.fill(value, { force: true })
      await field.press('Tab')
    }
    await this.page.waitForLoadState('domcontentloaded')

    if (clickUpdateButton === true) {
      await expect(this.passwordUpdateButton).toBeEnabled({ timeout: 30_000 })
      await this.passwordUpdateButton.waitFor({ state: 'visible' })
      await this.passwordUpdateButton.click({ force: true })
    }
  }

  /**
   * Returns a Locator for a specific gender option within the gender selection component.
   * This is a helper method used internally by `selectGender`.
   * @param gender - The gender code (e.g., 'f' for female, 'm' for male).
   * @returns A Playwright Locator for the specific gender option.
   */
  private genderOption(gender: string): Locator {
    return this.page.getByTestId(`gender-option-${gender}`)
  }

  /**
   * Selects a gender option in the user profile.
   * @param gender - The gender code to select (e.g., 'f' for female, 'm' for male).
   */
  async selectGender(gender: string) {
    await this.genderSelection.scrollIntoViewIfNeeded()
    await this.genderSelection.waitFor({ state: 'visible' })
    await this.genderSelection.click()

    const option = this.genderOption(gender)
    await option.waitFor({ state: 'visible' })
    // Mobile: list is `position: fixed` + Popover top layer; Playwright can treat the
    // option as outside the viewport when scrolling. A real DOM click still runs handlers.
    await option.evaluate((el: HTMLElement) => {
      el.click()
    })
  }
}
