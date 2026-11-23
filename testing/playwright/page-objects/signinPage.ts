import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { CHECKOUT_ACCESS_TOKEN_KEY, ROUTES } from '../support/constants'
import { Base } from './base/base'

/**
 * Page Object Model for the Sign-In and Registration Page.
 * Encapsulates locators and methods for interacting with user login,
 * new user registration, and password reset functionalities.
 */
export class SignInPage extends Base {
  // --- Login Form Locators ---
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator
  readonly notificationError: Locator
  readonly loginTab: Locator
  readonly loginForm: Locator
  /** Switches from the passwordless entry view to the email/password login or register form. */
  readonly passwordlessUsePasswordButton: Locator

  // --- Registration Form Locators ---
  readonly registerTab: Locator
  readonly regGenderSelector: Locator
  readonly regGenderOption: Locator
  readonly regInputFirstName: Locator
  readonly regInputLastName: Locator
  readonly regInputEmailAddress: Locator
  readonly regInputPassword: Locator
  readonly regConfirmPassword: Locator
  readonly registerButton: Locator
  readonly registerForm: Locator
  readonly registerGuestSwitch: Locator
  readonly registerGuestInfo: Locator
  readonly regFirstNameError: Locator
  readonly regLastNameError: Locator
  readonly regEmailError: Locator
  readonly regPasswordError: Locator

  // --- Password Toggle Locators ---
  readonly passwordVisibilityIcon: Locator

  // --- Password Reset / Forgot Password Locators ---
  readonly forgotPasswordForm: Locator
  readonly resetPasswordForm: Locator
  readonly forgotPasswordButton: Locator
  readonly resetPasswordEmailInput: Locator
  readonly resetPasswordButton: Locator
  readonly forgotPasswordNotificationError: Locator
  readonly forgotPasswordNotificationSuccess: Locator
  readonly resetPasswordInput: Locator
  readonly resetPasswordConfirmInput: Locator
  readonly validationErrorText: Locator
  readonly resetPasswordNotificationError: Locator
  readonly resetPasswordNotificationSuccess: Locator
  readonly submitNewPasswordButton: Locator

  // --- User Popover / Header Elements (after login) ---
  readonly greetingUserFirstName: Locator
  readonly userPopoverEmail: Locator
  readonly userPopoverLogoutButton: Locator

  // --- Generic Page Elements / Links ---
  readonly h1: Locator
  readonly pageTitle: Locator
  readonly createAccountLabel: Locator
  readonly signinPageLink: Locator
  readonly privacyDisclaimerInfo: Locator
  readonly termsOfServiceLink: Locator
  readonly privacyPolicyLink: Locator
  readonly loginPageLink: Locator
  /**
   * Initializes the SignInPage Page Object.
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    super(page)

    // Login Form
    this.emailInput = page.locator('[data-test-id="login-email"]')
    this.passwordInput = page.locator('[data-test-id="login-password"]')
    this.loginButton = page.locator('[data-test-id="login-and-continue"]')
    this.notificationError = page.locator('[data-test-id="notification-error"]')
    this.loginTab = page.locator('[data-test-id="login-option"]')
    this.loginForm = page.locator('[data-test-id="login-form"]')
    this.passwordlessUsePasswordButton = page.locator(
      '[data-test-id="passwordless-use-password"]',
    )

    // Registration Form
    this.registerTab = page.locator('[data-test-id="register-option"]')
    this.regGenderSelector = page.locator(
      '[data-test-id="register-gender-dropdown"]',
    )
    this.regGenderOption = page.locator(
      '[data-test-id="register-gender-dropdown-option"]',
    )
    this.regInputFirstName = page.locator('[data-test-id="register-firstName"]')
    this.regInputLastName = page.locator('[data-test-id="register-lastName"]')
    this.regInputEmailAddress = page.locator('[data-test-id="register-email"]')
    this.regInputPassword = page.locator('[data-test-id="register-password"]')
    this.regConfirmPassword = page.locator(
      '[data-test-id="register-confirm-password"]',
    )
    this.registerButton = page.locator('[data-test-id="register-and-continue"]')
    this.registerForm = page.locator('[data-test-id="register-form"]')
    this.registerGuestSwitch = page.getByTestId('register-guest-switch')
    this.registerGuestInfo = page.getByTestId('register-guest-info')
    this.regFirstNameError = this.registrationFieldError('register-firstName')
    this.regLastNameError = this.registrationFieldError('register-lastName')
    this.regEmailError = this.registrationFieldError('register-email')
    this.regPasswordError = this.registrationFieldError('register-password')

    // Password Toggle
    this.passwordVisibilityIcon = page.locator(
      '[data-test-id="password-visibility-icon"]',
    )

    // Password Reset / Forgot Password
    this.forgotPasswordForm = page.locator(
      '[data-test-id="forgot-password-form"]',
    )
    this.resetPasswordForm = page.locator(
      '[data-test-id="password-reset-form"]',
    )
    this.forgotPasswordButton = page.locator('[data-test-id="forgot-password"]')
    this.resetPasswordEmailInput = page.locator(
      '[data-test-id="forgot-password-email"]',
    )
    this.resetPasswordButton = page.locator('[data-test-id="reset-password"]')
    this.forgotPasswordNotificationError = page.locator(
      '[data-test-id=forgot-password-notification-error]',
    )
    this.forgotPasswordNotificationSuccess = page.locator(
      '[data-test-id=forgot-password-notification-success]',
    )
    this.resetPasswordInput = page.locator('[data-test-id="reset-password"]')
    this.resetPasswordConfirmInput = page.locator(
      '[data-test-id="reset-confirm-password"]',
    )
    this.validationErrorText = page.getByTestId('validation-error-text')
    this.resetPasswordNotificationError = page.locator(
      '[data-test-id="notification-error"]',
    )
    this.resetPasswordNotificationSuccess = page.locator(
      '[data-test-id="notification-success"]',
    )
    this.submitNewPasswordButton = page.locator(
      '[data-test-id="submit-password-reset"]',
    )

    // User Popover / Header Elements
    this.greetingUserFirstName = page.getByTestId('greeting-user-firstname')
    this.userPopoverEmail = page.getByTestId('user-popover-email')
    this.userPopoverLogoutButton = page.getByTestId(
      'account-popover-logout-button',
    )

    // Generic Page Elements / Links
    this.h1 = page.locator('h1')
    this.pageTitle = page.getByTestId('headline')
    this.createAccountLabel = page.getByTestId('create-account-label')
    this.signinPageLink = page.getByTestId('signin-page-link')
    this.privacyDisclaimerInfo = page.getByTestId('privacy-disclaimer-info')
    this.termsOfServiceLink = page.getByTestId('terms-of-service-link')
    this.privacyPolicyLink = page.getByTestId('privacy-policy-link')
    this.loginPageLink = page.getByTestId('login-page-link')
  }

  // --- Private Helper Methods ---

  /**
   * Returns a Locator for the validation error message of a registration form field.
   * Used internally to create error message locators for registration fields.
   * @param fieldTestId - The data-test-id of the registration field (e.g., 'register-firstName').
   * @returns A Playwright Locator for the error message within the field's form-item container.
   */
  private registrationFieldError(fieldTestId: string): Locator {
    return this.page
      .locator('[data-test-id="register-form"]')
      .locator('.form-item')
      .filter({ has: this.page.locator(`[data-test-id="${fieldTestId}"]`) })
      .locator('.inline-error-message')
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

  // --- Action Methods ---

  /**
   * Switches from the passwordless entry view to the standard email/password login form.
   * The auth component shows passwordless first; this reveals the password form.
   */
  async openPasswordLoginForm() {
    await this.passwordlessUsePasswordButton.waitFor({ state: 'visible' })
    await this.passwordlessUsePasswordButton.click()
    await this.loginForm.waitFor({ state: 'visible' })
  }

  /**
   * Switches to the register tab, then from the passwordless entry view to the
   * email/password registration form.
   */
  async openPasswordRegisterForm() {
    await this.registerTab.waitFor({ state: 'visible' })
    await this.registerTab.click()
    await this.passwordlessUsePasswordButton.waitFor({ state: 'visible' })
    await this.passwordlessUsePasswordButton.click()
    await this.registerForm.waitFor({ state: 'visible' })
  }

  /**
   * Fills in the email and password fields on the login form.
   * @param email - The email address to enter.
   * @param password - The password to enter.
   */
  async fillLoginData(email: string, password: string) {
    await this.openPasswordLoginForm()
    await this.emailInput.focus()
    await this.emailInput.fill(email)
    await this.passwordInput.focus()
    await this.passwordInput.fill(password)
  }

  /**
   * Clicks the login button and waits until login has either succeeded or failed.
   *
   * Success is detected by the Checkout Auth SDK writing `CHECKOUT_ACCESS_TOKEN_KEY`
   * to `localStorage` (see `CHECKOUT_AUTH_STORAGE_KEYS` / `useCheckoutWebComponent`).
   * Failure is detected via the login error notification. That node lives in the
   * Checkout Auth web component shadow root, so this uses a Playwright locator
   * (which pierces open shadow roots) rather than `document.querySelector`.
   */
  async clickLoginButton() {
    await this.loginButton.first().click()

    await expect
      .poll(
        async () => {
          const hasToken = await this.page.evaluate(
            (key) => window.localStorage.getItem(key) !== null,
            CHECKOUT_ACCESS_TOKEN_KEY,
          )
          if (hasToken) {
            return true
          }
          return this.notificationError.isVisible()
        },
        { timeout: 15_000 },
      )
      .toBe(true)

    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Waits until the page has left the sign-in route after a successful login.
   *
   * `clickLoginButton` returns as soon as the access token is stored, but the
   * Storefront Application then reloads the customer data and replaces the page with
   * the redirect target. Navigating before that redirect lets it take the page away
   * again. Do not call this after a failed login, because the page stays on the
   * sign-in route.
   *
   * @param options.timeout - Maximum time to wait in milliseconds, defaults to the test timeout.
   * @param options.waitUntil - The load state the new page must reach, defaults to `load`.
   */
  async waitForRedirectAfterLogin(
    options: {
      timeout?: number
      waitUntil?: 'load' | 'domcontentloaded'
    } = {},
  ) {
    await this.page.waitForURL(
      (url) => !url.pathname.includes(`/${ROUTES.signin}`),
      options,
    )
  }

  /**
   * Fills in the registration form fields for a new user.
   * @param firstName - The first name for registration.
   * @param lastName - The last name for registration.
   * @param emailAddress - The email address for registration.
   * @param password - The password for registration.
   */
  async fillRegistrationData(
    firstName: string,
    lastName: string,
    emailAddress: string,
    password: string,
  ) {
    await this.regInputFirstName.waitFor()
    await this.regInputFirstName.focus()
    await this.regInputFirstName.fill(firstName)

    await this.regInputLastName.focus()
    await this.regInputLastName.fill(lastName)

    await this.regInputEmailAddress.focus()
    await this.regInputEmailAddress.fill(emailAddress)

    await this.regInputPassword.focus()
    await this.regInputPassword.fill(password)

    await this.regConfirmPassword.focus()
    await this.regConfirmPassword.fill(password)
  }

  /**
   * Opens the forgot-password form from an already visible login overlay.
   */
  async openForgotPasswordForm() {
    await this.openPasswordLoginForm()
    await this.forgotPasswordButton.waitFor({ state: 'visible' })
    await this.forgotPasswordButton.click()
    await this.forgotPasswordForm.waitFor({ state: 'visible' })
    await expect(this.resetPasswordEmailInput).toHaveValue('')
    await expect(this.resetPasswordButton).toBeVisible()
  }

  /**
   * Fills the forgot-password email field in a way that triggers the auth web
   * component validation (plain `fill()` after an error can leave submit stuck).
   *
   * @param email - Email address to enter.
   */
  async fillForgotPasswordEmail(email: string) {
    const input = this.resetPasswordEmailInput
    await input.click()
    await this.page.keyboard.press('ControlOrMeta+a')
    await this.page.keyboard.press('Backspace')
    await input.pressSequentially(email, { delay: 30 })
    await expect(input).toHaveValue(email)
    await input.blur()
  }

  /**
   * Submits the forgot-password form and waits for the auth API response plus
   * either the success or error notification to appear.
   */
  async submitForgotPasswordRequest() {
    await expect(this.resetPasswordButton).toBeEnabled()

    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('send-reset-email') &&
        response.request().method() === 'POST',
      { timeout: 45_000 },
    )

    await this.resetPasswordButton.click()
    await responsePromise

    await expect(
      this.forgotPasswordNotificationError.or(
        this.forgotPasswordNotificationSuccess,
      ),
    ).toBeVisible({ timeout: 15_000 })
  }
}
