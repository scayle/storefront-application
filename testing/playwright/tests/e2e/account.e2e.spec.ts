import { expect } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import {
  getCustomerForBrowser,
  isMobile,
  randomPastBirthDate,
} from '../../support/utils'
import {
  CUSTOMER_ACCOUNT,
  TEST_CUSTOMERS,
  LOGIN_REGISTRATION,
  ROUTES,
} from '../../support/constants'
import { authState } from '../../support/auth'

/**
 * @file Contains end-to-end tests for the customer account area functionality.
 * This suite verifies account page navigation, customer data updates, and password management.
 */

test.describe('Account area', () => {
  // The password test makes the server refresh the tokens of the saved session, so the tests of
  // this describe run in order instead of writing to it at once.
  test.use(authState('default'))
  test.describe.configure({ mode: 'default' })

  test.beforeEach(async ({ page, countryDetector, accountPage }) => {
    await accountPage.navigate(
      page,
      CUSTOMER_ACCOUNT.routeOrders,
      'networkidle',
    )
    await countryDetector.closeModal()
    await accountPage.accountTabOrders.waitFor()

    await expect(page).toHaveURL(/\/orders/)
  })

  /**
   * Verifies that the Orders tab is loaded by default upon navigating to the Account area.
   * Verifies that the Orders tab has the 'aria-current' attribute set to 'page' and that the URL contains the orders route.
   * It then proceeds to verify the loading of the Subscriptions and Profile pages by clicking their respective tabs.
   */
  test('C2188614 C2188628 Verify Account area landing page', async ({
    accountPage,
    page,
    header,
  }) => {
    await test.step('Verify Orders tab is loaded by default', async () => {
      await (
        isMobile(page)
          ? header.headerLoginButtonMobile.first()
          : header.headerLoginButton.first()
      ).click()
      await accountPage.accountTabOrders.waitFor()

      await expect(accountPage.accountTabOrders).toHaveAttribute(
        'aria-current',
        'page',
      )
      expect(page.url()).toContain(`/${CUSTOMER_ACCOUNT.routeOrders}`)
    })

    await test.step('Verify Profile page is loaded', async () => {
      await accountPage.accountTabProfile.click()
      await page.waitForLoadState('domcontentloaded')

      await expect(accountPage.accountTabProfile).toHaveAttribute(
        'aria-current',
        'page',
      )
      expect(page.url()).toContain(`/${CUSTOMER_ACCOUNT.routeProfile}`)
      await expect(accountPage.userProfileHeadline).toBeVisible()
      await expect(accountPage.accountInfoHeadline).toBeVisible()
      await expect(accountPage.personalInfoHeadline).toBeVisible()
      await expect(accountPage.passwordHeadline).toBeVisible()
    })
  })

  /**
   * Verifies the process of updating customer personal data with a correct,
   * an incorrect and an emptied birth date, asserting success messages or
   * validation errors accordingly.
   */
  test('C2190952 Verify Account user data update', async ({
    accountPage,
    toastMessage,
    page,
    header,
  }) => {
    await test.step('Update customer data - correct input format', async () => {
      await accountPage.accountTabOrders.waitFor()
      await accountPage.accountTabProfile.click()
      await page.waitForLoadState('domcontentloaded')
      await accountPage.selectGender('f')
      await accountPage.updateUserData(
        CUSTOMER_ACCOUNT.firstName,
        CUSTOMER_ACCOUNT.lastName,
        randomPastBirthDate(),
        true,
      )
      await toastMessage.assertToastInfoIsVisible()
    })

    let invalidDateMessage = ''

    await test.step('Update customer data - incorrect birth date input format', async () => {
      await expect(toastMessage.toastInfo.first()).not.toBeVisible({
        timeout: 15_000,
      })
      await accountPage.updateUserData(
        CUSTOMER_ACCOUNT.firstName,
        CUSTOMER_ACCOUNT.lastName,
        CUSTOMER_ACCOUNT.birthDateIncorrect,
        false,
      )
      await expect(accountPage.birthdateValidationLabel).toBeVisible()
      await accountPage.assertPersonalInfoSaveBlocked()
      invalidDateMessage =
        await accountPage.birthdateValidationLabel.innerText()
    })

    // The first step stored a birth date, and a stored one cannot be removed.
    await test.step('Update customer data - emptied birth date', async () => {
      await accountPage.updateUserData(
        CUSTOMER_ACCOUNT.firstName,
        CUSTOMER_ACCOUNT.lastName,
        '',
        false,
      )
      // Locale-agnostic check that the required rule replaced the invalid date one.
      await expect(accountPage.birthdateValidationLabel).not.toHaveText(
        invalidDateMessage,
      )
      await accountPage.assertPersonalInfoSaveBlocked()
    })
  })

  /**
   * Verifies the password update process, including successful updates
   * with correct credentials and the display of error messages for incorrect
   * current passwords.
   */
  test('C2188629 Verify Account password update', async ({
    accountPage,
    toastMessage,
    page,
    header,
  }) => {
    test.setTimeout(90_000)

    await test.step('Update password - correct format and matching passwords', async () => {
      await accountPage.accountTabOrders.waitFor()
      await accountPage.accountTabProfile.click()
      await page.waitForLoadState('domcontentloaded')
      await accountPage.updatePassword(
        TEST_CUSTOMERS.testCustomerPassword,
        TEST_CUSTOMERS.testCustomerPassword,
        true,
      )
      await toastMessage.assertToastInfoIsVisible()
    })

    await test.step('Update password - incorrect current password', async () => {
      await accountPage.updatePassword(
        CUSTOMER_ACCOUNT.nonMatchingPassword,
        TEST_CUSTOMERS.testCustomerPassword,
        true,
      )
      await page.waitForLoadState('domcontentloaded')
      await expect(accountPage.passwordErrorMessage).toBeVisible({
        timeout: 25_000,
      })
    })
  })
})

/**
 * Verifies the header user profile flyout for guests and logged-in customers (desktop only).
 * As a guest, hover shows login and register links. After logging in via the flyout,
 * the greeting with the customer first name is displayed in the flyout.
 */
test.describe('User account flyout', () => {
  test.beforeEach(async ({ page, countryDetector, homePage }) => {
    await homePage.navigate(page, ROUTES.home, 'networkidle')
    await countryDetector.closeModal()
  })

  test('C2352417 Verify User Account Flyout', async ({
    page,
    header,
    signinPage,
    homePage,
    countryDetector,
  }, testInfo) => {
    test.skip(isMobile(page), 'Test only for desktop browsers')

    const { email, password } = getCustomerForBrowser(testInfo.project.name)

    await test.step('As non-logged-in user, hover user link and assert login/register visible', async () => {
      await header.headerLoginButton.first().hover()
      await header.userFlyoutLoginLink.waitFor()
      await header.userFlyoutRegisterLink.waitFor()
      await expect(header.userFlyoutLoginLink).toBeVisible()
      await expect(header.userFlyoutRegisterLink).toBeVisible()
      await expect(header.userFlyoutRegisterLink).toHaveAttribute(
        'href',
        expect.stringContaining(`signin?${LOGIN_REGISTRATION.regUrlParam}`),
      )
    })

    await test.step('Click login and assert signin route with redirectUrl', async () => {
      await header.userFlyoutLoginLink.click()
      await page.waitForURL(/\/signin/, { waitUntil: 'domcontentloaded' })
    })

    await test.step('Log in as test customer and assert greeting in flyout', async () => {
      await signinPage.fillLoginData(email, password)
      await signinPage.clickLoginButton()
      await signinPage.waitForRedirectAfterLogin({ timeout: 15_000 })
      await homePage.navigate(page, ROUTES.home, 'networkidle')
      await countryDetector.closeModal()

      const greeting = header.userFlyoutGreetingFirstname
      await expect(async () => {
        await header.headerLoginButton.first().hover()
        await expect(greeting).toBeVisible({ timeout: 8000 })
      }).toPass({ timeout: 25000 })
      await expect(header.userFlyoutGreetingFirstname).toContainText(
        CUSTOMER_ACCOUNT.firstName,
      )

      await test.step('Assert user flyout has links to profile and orders', async () => {
        await expect(header.userFlyoutProfileLink).toBeVisible()
        await expect(header.userFlyoutProfileLink).toHaveAttribute(
          'href',
          expect.stringContaining('/account/profile'),
        )
        await expect(header.userFlyoutOrdersLink).toBeVisible()
        await expect(header.userFlyoutOrdersLink).toHaveAttribute(
          'href',
          expect.stringContaining('/account/orders'),
        )
      })

      await test.step('Click logout and assert customer is logged out', async () => {
        await header.userFlyoutLogoutButton.click()
        await page.waitForLoadState('domcontentloaded')
        await header.userFlyoutLoginLink.waitFor({ state: 'visible' })
        await header.headerLoginButton.first().hover()
        await expect(header.userFlyoutLoginLink).toBeVisible()
        await expect(header.userFlyoutRegisterLink).toBeVisible()
      })
    })
  })
})

/**
 * Verifies that the subscriptions tab navigates to the subscriptions route.
 * Page content is not asserted until the subscriptions page is fully available.
 */
test.describe('C2638902 Verify Account subscriptions', () => {
  test.use(authState('default'))

  test.beforeEach(async ({ page, countryDetector, accountPage }) => {
    await accountPage.navigate(
      page,
      CUSTOMER_ACCOUNT.routeOrders,
      'networkidle',
    )
    await countryDetector.closeModal()
    await accountPage.accountTabOrders.waitFor()

    await expect(page).toHaveURL(/\/orders/)
  })

  test('Account subscriptions tab navigates to subscriptions URL', async ({
    accountPage,
    page,
  }) => {
    await accountPage.accountTabOrders.waitFor()
    await accountPage.openAccountTab(accountPage.accountTabSubscriptions)

    expect(new URL(page.url()).pathname).toContain(
      `/${CUSTOMER_ACCOUNT.routeSubscriptions}`,
    )
  })
})
