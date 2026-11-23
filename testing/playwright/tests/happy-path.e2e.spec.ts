import { expect } from '@playwright/test'
import { test } from '../fixtures/fixtures'
import { navigateToPdpFromPlp, navigateToPlp } from '../support/utils'
import { ROUTES } from '../support/constants'

/**
 * Simulates a happy path user journey starting from the homepage,
 * navigating to a Product Listing Page (PLP), adding a product to the wishlist,
 * opening the Product Detail Page (PDP), adding the product to the basket,
 * and finally navigating to the checkout page, without "buying" the product.
 * The basket is emptied at the end to ensure a clean state for subsequent tests.
 */
test('C2139186: E2E from Home to Checkout - happy path', async ({
  homePage,
  productListingPage,
  productDetailPage,
  header,
  basketPage,
  page,
  signinPage,
  mobileNavigation,
  countryDetector,
  mainNavigation,
  breadcrumb,
  storefrontAPIClient,
}) => {
  await test.step('Navigate to PLP', async () => {
    await homePage.navigate(page, ROUTES.home, 'domcontentloaded')
    await homePage.homepageMainContent.waitFor()
    await countryDetector.closeModal()
    await navigateToPlp(
      page,
      mobileNavigation,
      mainNavigation,
      storefrontAPIClient,
    )
    await breadcrumb.breadcrumbCategoryActive.waitFor()
  })

  await test.step('Add product to Wishlist from PLP', async () => {
    await expect(async () => {
      await productListingPage.addProductToWishlist()
      await expect(header.wishlistNumItems).toBeVisible()
      await expect(header.wishlistNumItems).toHaveText('1')
    }).toPass()
  })

  await test.step('Open PDP and add product to Basket', async () => {
    await navigateToPdpFromPlp(page, productListingPage, productDetailPage)
    await countryDetector.closeModal()
    await productDetailPage.chooseProductVariant()
    await productDetailPage.addProductToBasket()
    await expect(header.basketNumItems).toHaveText('1')

    const basketProductNameText =
      await productDetailPage.productName.textContent()

    await header.visitBasketPage()
    await basketPage.basketProductCard.first().waitFor()
    await basketPage.assertProductIsInBasket(basketProductNameText as string)
  })

  await test.step('Go to Checkout page', async () => {
    await basketPage.checkoutButton.waitFor({ state: 'visible' })
    await basketPage.checkoutButton.click()
    await signinPage.openPasswordLoginForm()
    await signinPage.loginButton.waitFor({ state: 'visible' })
    expect(page.url()).toContain(`/${ROUTES.checkout}`)
  })

  await test.step('Empty Basket to have clean state after test execution', async () => {
    await expect(async () => {
      await header.backToShopButton.click()
      await page.waitForLoadState('domcontentloaded')
      await homePage.homepageMainContent.waitFor()
      await countryDetector.closeModal()
      await header.visitBasketPage()
      await basketPage.basketProductCard.first().waitFor()
      await basketPage.removeItemFromBasket()
    }).toPass()
  })
})
