import { expect } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import { isMobile, verifySeoMetaTags, fillInput } from '../../support/utils'
import {
  TEST_CUSTOMERS,
  LOGIN_REGISTRATION,
  CUSTOMER_ACCOUNT,
  ROUTES,
  TEST_PASSWORD_RESET_HASH,
} from '../../support/constants'

/**
 * @file Contains end-to-end tests related to user login and registration functionality.
 */

/**
 * Performs setup before each test case within this file.
 * It navigates to the homepage, waits for the network to be idle,
 * and closes the country detector modal if present.
 */
test.beforeEach(async ({ homePage, page, countryDetector }) => {
  await homePage.navigate(page, ROUTES.home, 'networkidle')
  await page.waitForLoadState('networkidle')
  await countryDetector.closeModal()
})

/**
 * Verifies the user login and logout flow.
 *
 * Prerequisites for this test:
 * - A registered customer account with valid credentials.
 * - The email address for this customer must be defined via `TEST_CUSTOMER_EMAIL1` environment variable
 * (e.g., "customer1@example.com").
 * - The password for this customer must be defined via `TEST_CUSTOMER_PASSWORD` environment variable.
 * The password should have a minimum length of 8 characters and include at least one
 * special character, one uppercase letter, one lowercase letter, and one number.
 */
test('C2130648 C2171377 Verify User login and log out', async ({
  signinPage,
  header,
  toastMessage,
  page,
  ordersPage,
  mobileNavigation,
}) => {
  await test.step('Log in', async () => {
    await (
      isMobile(page)
        ? header.headerLoginButtonMobile.first()
        : header.headerLoginButton.first()
    ).click()
    await signinPage.fillLoginData(
      TEST_CUSTOMERS.testCustomerEmail1,
      TEST_CUSTOMERS.testCustomerPassword,
    )
    await signinPage.clickLoginButton()
    await toastMessage.assertToastInfoIsVisible()
    await page.waitForLoadState('domcontentloaded')
    await (
      isMobile(page)
        ? header.headerLoginButtonMobile.first()
        : header.headerLoginButton.first()
    ).click()
    await ordersPage.ordersHeadline.waitFor()
    expect(page.url()).toContain(`/${CUSTOMER_ACCOUNT.routeOrders}`)
  })

  await test.step('Log out', async () => {
    if (isMobile(page)) {
      await mobileNavigation.logoutFromMobileSidebar()
    } else {
      await header.headerLoginButton.first().focus()
      await header.headerLoginButton.first().press('Space')
    }

    await page.waitForLoadState('domcontentloaded')
  })
})

/**
 * Verifies the user login with invalid credentials.
 *
 * Prerequisites for this test:
 * - The email address is defined in constant key `TEST_CUSTOMERS.nonExistingEmail` as a correctly formatted dummy e-mail address.
 * - The wrong password must be defined via `TEST_CUSTOMER_WRONG_PASSWORD` environment variable.
 */
test('C2130649 Verify User login with wrong credentials', async ({
  signinPage,
  header,
  page,
}) => {
  await expect(async () => {
    await (
      isMobile(page)
        ? header.headerLoginButtonMobile.first()
        : header.headerLoginButton.first()
    ).click()
    await signinPage.fillLoginData(
      TEST_CUSTOMERS.nonExistingEmail,
      TEST_CUSTOMERS.wrongPassword,
    )

    await signinPage.clickLoginButton()
    await signinPage.notificationError.waitFor()
    await expect(signinPage.notificationError).toBeVisible()
  }).toPass()
})

/**
 * Verifies that attempting to register with an email
 * address that is already associated with an existing account displays
 * an error message and does not create a customer.
 *
 * Prerequisites for this test:
 * - A registered customer account with valid credentials.
 * - The email address for this customer must be defined via `TEST_CUSTOMER_EMAIL1` environment variable
 * (e.g., "customer1@example.com").
 * - The password for this customer must be defined via `TEST_CUSTOMER_PASSWORD` environment variable.
 * The password should have a minimum length of 8 characters and include at least one
 * special character, one uppercase letter, one lowercase letter, and one number.
 */
test('C2171373 Verify User registration with already registered user account', async ({
  signinPage,
  header,
  page,
}) => {
  await test.step('Open Signin page and the password registration form', async () => {
    await (
      isMobile(page)
        ? header.headerLoginButtonMobile.first()
        : header.headerLoginButton.first()
    ).waitFor()
    await (
      isMobile(page)
        ? header.headerLoginButtonMobile.first()
        : header.headerLoginButton.first()
    ).click()
    await signinPage.openPasswordRegisterForm()
  })

  await test.step('Fill and submit register form', async () => {
    await signinPage.regGenderSelector.first().click()
    await signinPage.regGenderOption.first().click()
    await signinPage.fillRegistrationData(
      TEST_CUSTOMERS.registrationFirstName,
      TEST_CUSTOMERS.registrationLastName,
      TEST_CUSTOMERS.testCustomerEmail1,
      TEST_CUSTOMERS.testCustomerPassword,
    )
    await signinPage.registerButton.click()
  })

  await test.step('Assert error banner is visible and user is not logged in', async () => {
    await signinPage.notificationError.waitFor()
    await expect(signinPage.notificationError).toBeVisible()
    await page.waitForLoadState('networkidle')
    await signinPage.loginTab.click()
    await signinPage.openPasswordLoginForm()
    await expect(signinPage.loginButton).toBeVisible()
  })
})

/**
 * Verifies that the password toggle button on the registration
 * form correctly shows and hides the entered password, changing the input type.
 *
 * Prerequisites for this test:
 * - A valid password must be defined via `TEST_CUSTOMER_PASSWORD` environment variable. No account is involved, the test only fills the password field.
 * The password should have a minimum length of 8 characters and include at least one
 * special character, one uppercase letter, one lowercase letter, and one number.
 */
test('C2171375 Verify User registration password toggle button', async ({
  signinPage,
  header,
  page,
}) => {
  await (
    isMobile(page)
      ? header.headerLoginButtonMobile.first()
      : header.headerLoginButton.first()
  ).waitFor()
  await (
    isMobile(page)
      ? header.headerLoginButtonMobile.first()
      : header.headerLoginButton.first()
  ).click()
  await signinPage.openPasswordRegisterForm()

  await signinPage.regInputPassword.focus()
  await signinPage.regInputPassword.fill(TEST_CUSTOMERS.testCustomerPassword)
  await expect(signinPage.regInputPassword).toHaveAttribute('type', 'password')

  await signinPage.passwordVisibilityIcon.first().click()
  await expect(signinPage.regInputPassword).toHaveValue(
    TEST_CUSTOMERS.testCustomerPassword,
  )
  await expect(signinPage.regInputPassword).toHaveAttribute('type', 'text')
})

/**
 * Verifies the forgot-password flow for a non-existing email address.
 *
 * Prerequisites for this test:
 * - The email address in constant key `TEST_CUSTOMERS.nonExistingEmail` must not belong to a registered account.
 */
test('C2171379 Verify User reset password flow rejects unknown email', async ({
  signinPage,
  header,
  page,
}) => {
  await (
    isMobile(page)
      ? header.headerLoginButtonMobile.first()
      : header.headerLoginButton.first()
  ).click()
  await signinPage.openForgotPasswordForm()

  await signinPage.fillForgotPasswordEmail(TEST_CUSTOMERS.nonExistingEmail)
  await signinPage.submitForgotPasswordRequest()

  await expect(signinPage.forgotPasswordNotificationError).toBeVisible()
  await expect(signinPage.resetPasswordButton).toBeVisible()
})

/**
 * Verifies the forgot-password flow for an existing customer email.
 *
 * Runs in isolation from the unknown-email case so the auth web component is not
 * reused after an error response (which can leave the submit button loading forever).
 *
 * Prerequisites for this test:
 * - A registered customer account with valid credentials.
 * - The email address for this customer must be defined via `TEST_CUSTOMER_EMAIL1` environment variable
 * (e.g., "customer1@example.com").
 */
test('C2638910 Verify User reset password flow sends link for existing email', async ({
  signinPage,
  header,
  page,
}) => {
  await (
    isMobile(page)
      ? header.headerLoginButtonMobile.first()
      : header.headerLoginButton.first()
  ).click()
  await signinPage.openForgotPasswordForm()

  await signinPage.fillForgotPasswordEmail(TEST_CUSTOMERS.testCustomerEmail1)
  await signinPage.submitForgotPasswordRequest()

  await expect(signinPage.forgotPasswordNotificationSuccess).toBeVisible()
  await expect(signinPage.resetPasswordButton).toBeHidden()
})

/**
 * Verifies the process of setting a new password, including
 * handling incorrectly formatted passwords and successfully submitting
 * a correctly formatted password (even though the test hash might lead to an error).
 * Any hash can be used for the testing purposes to verify that the new password flyout loads correctly.
 *
 * Prerequisites for this test:
 * - A valid password must be defined via `TEST_CUSTOMER_PASSWORD` environment variable. No account is involved, the test only fills the password field.
 * The password should have a minimum length of 8 characters and include at least one
 * special character, one uppercase letter, one lowercase letter, and one number.
 */
test('C2171786 Verify setting the new password', async ({
  signinPage,
  page,
  countryDetector,
}) => {
  await test.step('Open reset password form', async () => {
    await signinPage.navigate(
      page,
      ROUTES.signin + TEST_PASSWORD_RESET_HASH,
      'networkidle',
    )
    await countryDetector.closeModal()
    await signinPage.resetPasswordInput.waitFor()

    await expect(signinPage.resetPasswordInput).toBeVisible()
    await expect(signinPage.resetPasswordConfirmInput).toBeVisible()
    await expect(signinPage.resetPasswordButton).toBeVisible()
  })

  await test.step('Enter correctly formatted password', async () => {
    await fillInput(
      signinPage.resetPasswordInput,
      TEST_CUSTOMERS.testCustomerPassword,
    )
    await fillInput(
      signinPage.resetPasswordConfirmInput,
      TEST_CUSTOMERS.testCustomerPassword,
    )

    await signinPage.submitNewPasswordButton.click()

    // Error message is expected because the test hash is used.
    await signinPage.resetPasswordNotificationError.waitFor()
    await expect(signinPage.resetPasswordNotificationError).toBeVisible()
  })
})

/**
 * Verifies the presence and correctness of specific SEO meta tags
 * (robots and canonical) on the user login and registration pages.
 */
test('C2171377 Verify User login and registration SEO data', async ({
  signinPage,
  header,
  page,
  baseURL,
}) => {
  await (
    isMobile(page)
      ? header.headerLoginButtonMobile.first()
      : header.headerLoginButton.first()
  ).waitFor()
  await (
    isMobile(page)
      ? header.headerLoginButtonMobile.first()
      : header.headerLoginButton.first()
  ).click()
  await signinPage.loginTab.waitFor()

  await verifySeoMetaTags(page, {
    robots: LOGIN_REGISTRATION.seoRobots,
    // Resolved relative to `baseURL`, so the country prefix stays in the canonical.
    canonical: new URL(ROUTES.signin, baseURL).href,
  })
  await expect(signinPage.h1).toBeAttached()
})

/**
 * Verifies that user registration form displays appropriate error messages
 * when invalid input data is provided for required fields.
 *
 * This test validates that:
 * - Empty first name triggers a validation error
 * - Empty last name triggers a validation error
 * - Invalid email format triggers a validation error
 * - Password that is too short triggers a validation error
 */
test('C2171372 Verify User registration with incorrect input data', async ({
  signinPage,
  header,
  page,
}) => {
  await test.step('Open Signin page and the password registration form', async () => {
    await (
      isMobile(page)
        ? header.headerLoginButtonMobile.first()
        : header.headerLoginButton.first()
    ).waitFor()
    await (
      isMobile(page)
        ? header.headerLoginButtonMobile.first()
        : header.headerLoginButton.first()
    ).click()
    await signinPage.openPasswordRegisterForm()
  })

  await test.step('Select gender option', async () => {
    await signinPage.regGenderSelector.first().click()
    await signinPage.regGenderOption.first().click()
  })

  await test.step('Fill registration form with invalid data', async () => {
    // Fill with invalid data: empty first name, empty last name, invalid email, short password
    await signinPage.regInputFirstName.waitFor()
    await signinPage.regInputFirstName.focus()
    await signinPage.regInputFirstName.fill('')
    await signinPage.regInputFirstName.blur()

    await signinPage.regInputLastName.focus()
    await signinPage.regInputLastName.fill('')
    await signinPage.regInputLastName.blur()

    await signinPage.regInputEmailAddress.focus()
    await signinPage.regInputEmailAddress.fill('invalid-email')
    await signinPage.regInputEmailAddress.blur()

    await signinPage.regInputPassword.focus()
    await signinPage.regInputPassword.fill('1234')
    await signinPage.regInputPassword.blur()
  })

  await test.step('Verify error messages are displayed for invalid fields', async () => {
    await expect(signinPage.regFirstNameError).toBeVisible()
    await expect(signinPage.regLastNameError).toBeVisible()
    await expect(signinPage.regEmailError).toBeVisible()
    await expect(signinPage.regPasswordError).toBeVisible()
  })

  await test.step('Attempt to submit form and verify errors persist', async () => {
    await signinPage.registerButton.click()
    await page.waitForLoadState('domcontentloaded')

    // Verify error messages are still visible after submit attempt
    await expect(signinPage.regFirstNameError).toBeVisible()
    await expect(signinPage.regLastNameError).toBeVisible()
    await expect(signinPage.regEmailError).toBeVisible()
    await expect(signinPage.regPasswordError).toBeVisible()
  })
})

/**
 * Redirects unauthenticated users from account profile to sign-in with redirectUrl,
 * then returns them to the profile page after login.
 */
test('C2638904 Verify Account profile redirects guests to sign-in and back after login', async ({
  page,
  signinPage,
  accountPage,
  countryDetector,
}) => {
  const profilePath = CUSTOMER_ACCOUNT.routeProfile

  await test.step('Visit account profile while logged out', async () => {
    await page.goto(profilePath, { waitUntil: 'domcontentloaded' })
    await countryDetector.closeModal()
    expect(page.url()).toContain(`/${ROUTES.signin}`)

    const redirectUrl = new URL(page.url()).searchParams.get('redirectUrl')
    expect(redirectUrl).toContain(`/${CUSTOMER_ACCOUNT.routeProfile}`)
  })

  await test.step('Sign in and land on account profile', async () => {
    await signinPage.fillLoginData(
      TEST_CUSTOMERS.testCustomerEmail1,
      TEST_CUSTOMERS.testCustomerPassword,
    )
    await signinPage.clickLoginButton()
    await page.waitForURL(
      (url) => url.pathname.includes(`/${CUSTOMER_ACCOUNT.routeProfile}`),
      {
        timeout: 20_000,
      },
    )
    await expect(accountPage.userProfileHeadline).toBeVisible()
  })
})
