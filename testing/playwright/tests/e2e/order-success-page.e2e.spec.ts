import { expect } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import {
  getHomepageUrl,
  verifySeoMetaTags,
  navigateToPlp,
} from '../../support/utils'
import { ROUTES, OSP_TEST_DATA } from '../../support/constants'
import { authState } from '../../support/auth'

/**
 * @file Contains end-to-end tests for the Order Success Page (OSP), verifying
 * order details, product information, price summary, SEO data, CTA buttons,
 * and the error page displayed for incorrect tokens.
 */

test.describe('Order success page (checkout flow)', () => {
  /**
   * Prerequisites for the checkout OSP test:
   * To avoid conflicts between browsers in the process of buying the product, every browser should use its own dedicated test customer.
   * Five test customers should be registered in the system and their e-mail addresses and password should match the values of
   * environment variables, as follows:
   * - `TEST_CUSTOMER_EMAIL1` - test customer for desktop Chromium.
   * - `TEST_CUSTOMER_EMAIL2` - test customer for desktop Firefox.
   * - `TEST_CUSTOMER_EMAIL3` - test customer for desktop Webkit (Safari).
   * - `TEST_CUSTOMER_EMAIL4` - test customer for mobile Chrome.
   * - `TEST_CUSTOMER_EMAIL5` - test customer for mobile Webkit (Safari).
   * - The password for all test customers is the same, and must be defined via `TEST_CUSTOMER_PASSWORD` environment variable.
   *
   * Starts from the saved session of the browser's dedicated test customer (see `tests/auth.setup.ts`).
   */
  test.use(authState('default'))

  test.beforeEach(async ({ page, countryDetector, homePage }) => {
    await homePage.navigate(page, ROUTES.home, 'networkidle')
    await countryDetector.closeModal()
  })

  // The basket belongs to the customer, not the session. A run that fails after adding the product
  // would leave it there for the next run. A hook still runs after a failed or timed-out test, and
  // it exits at once when the order emptied the basket.
  test.afterEach(async ({ page, basketPage }) => {
    test.setTimeout(test.info().timeout + 60_000)
    await page.goto(ROUTES.basket, { waitUntil: 'domcontentloaded' })
    await expect(async () => {
      if ((await basketPage.basketProductCard.count()) > 0) {
        await basketPage.removeItemFromBasket()
      }
      await expect(basketPage.basketProductCard).toHaveCount(0)
    }).toPass({ timeout: 60_000 })
  })

  /**
   * Verifies the visibility of the greeting box and order data on the OSP.
   * Verifies the visibility of payment and delivery address details on the OSP.
   * Verifies the details of the ordered product(s) on the OSP.
   * Verifies the price summary displayed on the OSP.
   * Verifies the SEO meta tags on the OSP.
   * Verifies the functionality of the "Continue Shopping" and "Order Details" CTA buttons on the OSP.
   * Verifies the overall structure and content of the OSP.
   *
   * Test prerequisites: Since this test "buys" the product, there should be some test product
   * in the system with available quantity in stock. The test customers and the checkout need the
   * setup listed under "Customers that can place an order" in `SETUP.md`.
   */
  test('C2173505 C2173506 C2173507 C2173508 C2181795 C2182370 C2181791 Verify OSP', async ({
    checkoutPage,
    page,
    baseURL,
    orderSuccessPage,
    mainNavigation,
    mobileNavigation,
    productListingPage,
    productDetailPage,
    countryDetector,
    breadcrumb,
    storefrontAPIClient,
  }) => {
    test.setTimeout(60000)

    await test.step('Add product to Basket', async () => {
      await navigateToPlp(
        page,
        mobileNavigation,
        mainNavigation,
        storefrontAPIClient,
      )

      await breadcrumb.breadcrumbCategoryActive.waitFor()
      await productListingPage.productCard.first().waitFor()
      await productListingPage.productImage.first().click()
      await page.waitForLoadState('domcontentloaded')
      await productDetailPage.chooseProductVariant()
      await productDetailPage.addProductToBasket()
    })

    await test.step('Visit Checkout page and continue with order', async () => {
      await orderSuccessPage.navigate(page, ROUTES.checkout, 'networkidle')
      await checkoutPage.basketContainer.waitFor()

      const pageUrl = page.url()

      expect(pageUrl).toContain(`/${ROUTES.checkout}`)
      await expect(
        checkoutPage.paymentInvoice,
        'The invoice payment method must be available for this test customer',
      ).toBeEnabled({ timeout: 15_000 })
      await checkoutPage.selectInvoice()
      await expect(checkoutPage.paymentInvoice).toBeChecked()
      await checkoutPage.checkboxAcceptTerms.scrollIntoViewIfNeeded()
      await checkoutPage.checkboxAcceptTerms.check()
      await checkoutPage.ctaPayButton.click()
    })

    await test.step('Verify OSP Order overview', async () => {
      await orderSuccessPage.ospGreetingBox.waitFor()
      await countryDetector.closeModal()

      await expect(orderSuccessPage.ospGreetingBox).toBeVisible()
      await expect(orderSuccessPage.ospGreetingBoxHeadline).toBeVisible()
      await expect(orderSuccessPage.ospOrderData).toBeVisible()
      await expect(orderSuccessPage.ospPaymentData).toBeVisible()
      await expect(orderSuccessPage.ospDeliveryAddress).toBeVisible()
    })

    await test.step('Verify OSP Order product details', async () => {
      await expect(orderSuccessPage.ospDeliveryDate).toBeVisible()
      await expect(orderSuccessPage.ospCarrier).toBeVisible()
      await expect(orderSuccessPage.ospProductCard.first()).toBeVisible()
      await expect(orderSuccessPage.ospProductImage.first()).toBeVisible()
      await expect(orderSuccessPage.ospProductBrand.first()).toBeVisible()
      await expect(orderSuccessPage.ospProductName.first()).toBeVisible()
      await expect(orderSuccessPage.ospProductColor.first()).toBeVisible()
      await expect(orderSuccessPage.ospProductSize.first()).toBeVisible()
      await expect(orderSuccessPage.ospProductQuantity.first()).toBeVisible()
      await expect(orderSuccessPage.ospProductPrice.first()).toBeVisible()
    })

    await test.step('Verify OSP Price summary', async () => {
      await orderSuccessPage.assertOspPriceSummary()
    })

    await test.step('Verify OSP SEO', async () => {
      await verifySeoMetaTags(page, {
        robots: OSP_TEST_DATA.seoRobots,
      })
    })

    await test.step('Verify OSP CTA buttons', async () => {
      await orderSuccessPage.ospButtonContinueShopping.click()

      await expect(page).toHaveURL(getHomepageUrl(baseURL))

      await page.goBack()
      await page.waitForLoadState('networkidle')
      await orderSuccessPage.ospButtonOrderDetails.waitFor()
      await orderSuccessPage.ospButtonOrderDetails.click()
      await page.waitForURL(new RegExp(`/${ROUTES.orders}`), {
        waitUntil: 'domcontentloaded',
      })
    })
  })
})

/**
 * Verifies that when the OSP is visited with an expired
 * confirmation token in the URL, an appropriate error page with a
 * specific headline, subheadline, and icon is displayed. It also checks
 * that the "Continue Shopping" button on the error page navigates
 * the user back to the homepage.
 */
test('C2182954 Verify OSP Error page', async ({
  page,
  orderSuccessPage,
  homePage,
}) => {
  await test.step('Visit OSP with incorrect token and assert page elements', async () => {
    await orderSuccessPage.navigate(
      page,
      OSP_TEST_DATA.incorrectCbdUrl,
      'networkidle',
    )
    await orderSuccessPage.ospEmptyStateContainer.waitFor()

    await expect(orderSuccessPage.ospEmptyStateHeadline).toBeVisible()
    await expect(orderSuccessPage.ospEmptyStateSubheadline).toBeVisible()
    await expect(orderSuccessPage.ospEmptyStateIcon).toBeVisible()
  })

  await test.step('Click Continue Shopping button and assert Homepage is loaded', async () => {
    await orderSuccessPage.ospEmptyStateContinueShoppingButton.waitFor()
    await orderSuccessPage.ospEmptyStateContinueShoppingButton.click()
    await homePage.homepageMainContent.waitFor()

    await expect(homePage.homepageMainContent).toBeAttached()
  })
})
