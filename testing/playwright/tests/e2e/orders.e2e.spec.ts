import { expect } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import {
  TEST_CUSTOMERS,
  ROUTES,
  CUSTOMER_ACCOUNT,
} from '../../support/constants'
import { isMobile } from 'support/utils'

/**
 * @file Contains end-to-end tests for the customer's Orders page, verifying
 * the display of orders for customers with existing orders and the empty
 * state for customers without any orders.
 */

/**
 * Verifies that a logged-in customer with existing orders can view
 * their order history on the Orders page, open the details of a specific
 * order, navigate back to the orders list, and interact with pagination.
 *
 * Prerequisites for this test:
 * - A registered customer account with some orders placed.
 * - The number of orders should be more than 8, so the last step checking the pagination
 * can be executed.
 * - The email address for this customer must be defined via `TEST_CUSTOMER_EMAIL1` environment variable
 * (e.g., "customer1@example.com").
 * - The password for this customer must be defined via `TEST_CUSTOMER_PASSWORD` environment variable.
 *
 * Sign-in uses the UI (header → signin).
 */
test('C2132533 Verify Orders for user that has orders', async ({
  ordersPage,
  page,
  countryDetector,
  homePage,
  header,
  signinPage,
}) => {
  await test.step('Visit Orders page and assert the page is loaded', async () => {
    await homePage.navigate(page, ROUTES.home, 'networkidle')
    await countryDetector.closeModal()
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
    await signinPage.waitForRedirectAfterLogin({ timeout: 20_000 })
    await ordersPage.navigate(page, CUSTOMER_ACCOUNT.routeOrders, 'networkidle')
    await countryDetector.closeModal()
    await expect(ordersPage.ordersHeadline).toBeVisible({ timeout: 45_000 })
    await expect(ordersPage.orderStatus.first()).toBeVisible()
  })

  await test.step('Open the first order and check order details', async () => {
    const orderHeadlineText = (await ordersPage.orderItemHeadline
      .nth(0)
      .textContent()) as string
    const orderNumber = orderHeadlineText.split('#')[1]

    await ordersPage.selectOrder()
    await ordersPage.orderDetailsHeadline.waitFor()
    await expect(ordersPage.orderDetailsHeadline).toContainText(orderNumber)
    expect(page.url()).toContain(orderNumber)
    await expect(ordersPage.orderStatus).toBeVisible()
  })

  await test.step('Go back to orders list', async () => {
    await ordersPage.orderDetailsBackButton.click()
    await ordersPage.ordersHeadline.waitFor()
    expect(page.url()).toContain(`/${CUSTOMER_ACCOUNT.routeOrders}`)
  })

  await test.step('Check the pagination', async () => {
    await ordersPage.selectPage('2')
    await page.waitForURL(/\?page=2/)
  })
})

/**
 * Verifies that a logged-in customer who has not placed any orders
 * sees the empty state message and a "Continue Shopping" button on the
 * Orders page.
 *
 * Prerequisites for this test:
 * - A registered customer account with no orders placed.
 * - The email address for this customer must be defined via `TEST_CUSTOMER_NO_ORDERS` environment variable
 * (e.g., "customer-no-orders@example.com").
 * - The password for this customer must be defined via `TEST_CUSTOMER_PASSWORD` environment variable.
 *
 * Sign-in uses the UI (header → signin).
 */
test('C2132126 Verify Orders page - user without orders', async ({
  ordersPage,
  page,
  countryDetector,
  homePage,
  header,
  signinPage,
}) => {
  test.setTimeout(60_000)

  await homePage.navigate(page, ROUTES.home, 'networkidle')
  await countryDetector.closeModal()
  await (
    isMobile(page)
      ? header.headerLoginButtonMobile.first()
      : header.headerLoginButton.first()
  ).click()
  await signinPage.fillLoginData(
    TEST_CUSTOMERS.testCustomerNoOrders,
    TEST_CUSTOMERS.testCustomerPassword,
  )
  await signinPage.clickLoginButton()
  await signinPage.waitForRedirectAfterLogin({ timeout: 20_000 })
  await ordersPage.navigate(page, CUSTOMER_ACCOUNT.routeOrders, 'networkidle')
  await countryDetector.closeModal()
  await expect(ordersPage.emptyState).toBeVisible({ timeout: 45_000 })
  await expect(ordersPage.buttonContinueShopping).toBeVisible()
})
