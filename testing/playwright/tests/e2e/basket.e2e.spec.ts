import { expect } from '@playwright/test'
import type { Product, Variant } from '@scayle/storefront-api'
import { test } from '../../fixtures/fixtures'
import {
  getCustomerForBrowser,
  getHomepageUrl,
  verifySeoMetaTags,
  isMobile,
} from '../../support/utils'
import { BASKET_TEST_DATA, ROUTES } from '../../support/constants'
import {
  isProductSellableNow,
  isVariantBuyableNow,
  skipForCatalogGap,
} from '../../support/productTestHelpers'

/**
 * @file Contains end-to-end tests for the shopping basket page functionality.
 * This suite covers empty states, adding/removing products, and SEO verification.
 */

/**
 * Verifies that when a guest user navigates to the basket page,
 * the empty basket state with appropriate title and subtitle is displayed.
 * Verifies that when a logged-in customer with an empty basket navigates
 * to the basket page, the empty basket state is displayed, and the customer has
 * the option to continue shopping.
 *
 * Prerequisite for this test:
 * To avoid conflicts between browsers in empty and non-empty states, every browser should use its own dedicated test customer.
 * Five test customers should be registered in the system and their e-mail addresses and password should match the values of
 * environment variables, as follows:
 * - `TEST_CUSTOMER_EMAIL1` - test customer for desktop Chromium.
 * - `TEST_CUSTOMER_EMAIL2` - test customer for desktop Firefox.
 * - `TEST_CUSTOMER_EMAIL3` - test customer for desktop Webkit (Safari).
 * - `TEST_CUSTOMER_EMAIL4` - test customer for mobile Chrome.
 * - `TEST_CUSTOMER_EMAIL5` - test customer for mobile Webkit (Safari).
 * - The password for all test customers is the same, and must be defined via `TEST_CUSTOMER_PASSWORD` environment variable.
 */
test('C2132186 C2132187 Verify Basket empty state as a guest and logged in user', async ({
  header,
  basketPage,
  signinPage,
  page,
  baseURL,
  countryDetector,
}, testInfo) => {
  await test.step('Verify guest user', async () => {
    await basketPage.navigate(page, ROUTES.home, 'networkidle')
    await countryDetector.closeModal()
    await header.headerBasketButton.first().click()
    await page.waitForLoadState('domcontentloaded')
    await expect(async () => {
      expect(page.url()).toContain(`/${ROUTES.basket}`)
      await expect(basketPage.basketEmptyStateTitle).toBeVisible()
      await expect(basketPage.basketEmptyStateSubTitle).toBeVisible()
    }).toPass()
  })

  await test.step('Verify logged-in customer', async () => {
    await basketPage.assertContinueButton(getHomepageUrl(baseURL))
    await header.headerBasketButton.first().waitFor()
    await header.headerBasketButton.first().click()
    await expect(page).toHaveURL(new RegExp(`/${ROUTES.basket}`))
    await basketPage.loginButton.waitFor({ state: 'visible' })
    await basketPage.assertLoginButton()

    const projectName = testInfo.project.name
    const { email, password } = getCustomerForBrowser(projectName)

    await signinPage.fillLoginData(email, password)
    await signinPage.clickLoginButton()
    // Do not click the header basket control: it is disabled on the basket page.
    await signinPage.waitForRedirectAfterLogin({
      waitUntil: 'domcontentloaded',
    })
    await page.goto(ROUTES.basket, {
      waitUntil: 'domcontentloaded',
    })

    // Dedicated customers can retain items from other runs; clear before empty-state checks.
    const MAX_CLEAR_ATTEMPTS = 20
    let remainingItems = await basketPage.basketProductCard.count()
    for (
      let attempt = 0;
      remainingItems > 0 && attempt < MAX_CLEAR_ATTEMPTS;
      attempt++
    ) {
      const itemCountBeforeRemove = remainingItems
      await basketPage.removeItemFromBasket()
      await expect
        .poll(async () => basketPage.basketProductCard.count())
        .toBeLessThan(itemCountBeforeRemove)
      remainingItems = await basketPage.basketProductCard.count()
    }
    if (remainingItems > 0) {
      throw new Error(
        `Basket still has ${remainingItems} item(s) after ${MAX_CLEAR_ATTEMPTS} remove attempts`,
      )
    }

    await expect(basketPage.basketEmptyStateTitle).toBeVisible()
    await expect(basketPage.loginButton).toBeHidden()
    await expect(basketPage.continueButton).toBeVisible({ timeout: 5000 })
    await basketPage.assertContinueButton(getHomepageUrl(baseURL))
  })
})

/**
 * Verifies that a guest user can add a product to the basket,
 * then logs in, and the added product persists in their basket after login, and the ability
 * to remove a product from the basket.
 *
 * Prerequisites for this test are the same as for the test "C2132186 C2132187 Verify Basket empty state as a guest and logged in user".
 * This test is using the same dedicated test customers per browser, defined via environment variables.
 */
test('C2132198 Verify add to Basket', async ({
  header,
  basketPage,
  countryDetector,
  signinPage,
  storefrontAPIClient,
  page,
}, testInfo) => {
  await test.step('Add product to Basket as a non-logged in user', async () => {
    await basketPage.navigate(page, ROUTES.home, 'networkidle')
    await countryDetector.closeModal()

    const skippedProductIds = new Set<number>()
    const MAX_PRODUCT_ATTEMPTS = 8
    let selectedProduct: Product | undefined
    let selectedVariant: Variant | undefined

    for (let attempt = 0; attempt < MAX_PRODUCT_ATTEMPTS; attempt++) {
      const productData = await storefrontAPIClient.findProduct(
        (product) =>
          !skippedProductIds.has(product.id) &&
          isProductSellableNow(product) &&
          (product.variants?.some(isVariantBuyableNow) ?? false),
      )

      if (!productData) {
        break
      }

      const candidateVariants = (productData.variants ?? []).filter(
        isVariantBuyableNow,
      )

      for (const variant of candidateVariants) {
        try {
          await basketPage.addProductToBasket(variant.id, 1)
          selectedProduct = productData
          selectedVariant = variant
          break
        } catch (error) {
          const errorMessage = String(error)
          if (
            errorMessage.includes('Variant out of stock') ||
            errorMessage.includes('VARIANT_OUT_OF_STOCK')
          ) {
            continue
          }
          throw error
        }
      }

      if (selectedVariant) {
        break
      }

      skippedProductIds.add(productData.id)
    }

    test.skip(
      !selectedProduct || !selectedVariant,
      'No product with a currently addable variant found - skipping test',
    )

    console.log(
      `[Basket Test] Running with product ID: ${selectedProduct?.id}, variant ID: ${selectedVariant?.id}`,
    )

    await page.reload()
    await page.waitForLoadState('networkidle')
    await countryDetector.closeModal()

    await header.headerBasketButton.first().click()
    await page.waitForLoadState('networkidle')
    await basketPage.basketProductCard.first().waitFor()
    await expect(header.basketNumItems).toHaveText('1')
  })

  await test.step('Log in and assert the product is still in Basket', async () => {
    const projectName = testInfo.project.name
    const { email, password } = getCustomerForBrowser(projectName)

    await (
      isMobile(page)
        ? header.headerLoginButtonMobile.first()
        : header.headerLoginButton.first()
    ).click()
    await signinPage.fillLoginData(email, password)
    await signinPage.clickLoginButton()
    await signinPage.waitForRedirectAfterLogin({
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')
    await header.visitBasketPage()
    await basketPage.basketProductCard.first().waitFor()
    await expect(header.basketNumItems).toHaveText('1')
  })

  await test.step('Remove product from Basket', async () => {
    await expect(async () => {
      await basketPage.removeItemFromBasket()
      await expect(header.basketNumItems).toBeHidden()
    }).toPass()
  })
})

/**
 * Verifies that the price summary in the basket is calculated correctly for a single product the
 * Storefront API lists at a regular price.
 *
 * Prerequisite: a sellable product with a buyable variant and no applied reductions.
 *
 * The test adds the first such product and checks the arithmetic of the summary for whatever the
 * basket shows: final price equals subtotal minus the promotion and campaign total and every sale
 * line. It does not hunt for a product the basket shows without a discount, so it cannot end in a
 * skip because the prices of the catalog are stale. When the basket shows a discount for a product
 * the API lists without reductions, the test keeps going, adds an `api-basket-price-mismatch`
 * annotation, and leaves the verdict on that data problem to the tenant data spec. Only when the
 * basket shows no discount does it also compare the subtotal with the API price of the variant.
 */
test('C2167319 Verify Basket Price summary - regular product', async ({
  header,
  basketPage,
  countryDetector,
  page,
  storefrontAPIClient,
}) => {
  let apiPrice: number | undefined
  let basketShowsDiscount = false

  await test.step('Add regular product to Basket', async () => {
    const isRegularPrice = (variant: Variant) =>
      variant.price.appliedReductions.length === 0

    // A product can run out of stock between the API answer and the add, so another one is tried.
    // A discount in the basket is not a reason to look further.
    const MAX_OUT_OF_STOCK_RETRIES = 3
    const skippedProductIds = new Set<number>()
    let selectedProduct: Product | undefined

    await countryDetector.closeModal()

    for (let attempt = 0; attempt < MAX_OUT_OF_STOCK_RETRIES; attempt++) {
      const productData = await storefrontAPIClient.findProduct(
        (product) =>
          !skippedProductIds.has(product.id) &&
          isProductSellableNow(product) &&
          (product.variants?.every(isRegularPrice) ?? false) &&
          (product.variants?.some(isVariantBuyableNow) ?? false),
      )

      if (!productData) {
        break
      }

      const regularVariant = productData.variants!.find(isVariantBuyableNow)!

      if (!(await basketPage.tryAddProductToBasket(regularVariant.id))) {
        skippedProductIds.add(productData.id)
        continue
      }

      selectedProduct = productData
      apiPrice = regularVariant.price.withTax
      break
    }

    skipForCatalogGap(
      'C2167319',
      !selectedProduct,
      `Catalog gap: no sellable product without reductions and with a buyable variant.${
        skippedProductIds.size > 0
          ? ` Out of stock when added: product IDs ${[...skippedProductIds].join(', ')}.`
          : ''
      }`,
    )

    console.log(
      `[Basket Test] Running with regular product ID: ${selectedProduct?.id}`,
    )

    const { subtotal, finalPrice } = await basketPage.openBasketAndReadPrices(
      page,
      countryDetector,
    )
    await expect(header.basketNumItems).toHaveText('1')

    basketShowsDiscount = finalPrice !== subtotal
    if (basketShowsDiscount) {
      test.info().annotations.push({
        type: 'api-basket-price-mismatch',
        description: `Product ${selectedProduct?.id} has no reductions in the Storefront API but the basket shows a discount. The tenant data spec reports the prices.`,
      })
    }
  })

  await test.step('Check regular product price summary', async () => {
    await basketPage.priceFinal.waitFor()
    await basketPage.assertBasketPriceSummary('any')
    if (!basketShowsDiscount) {
      await basketPage.assertSubtotal(apiPrice!)
    }
  })
})

/**
 * Verifies that the price summary in the basket is calculated correctly for a single, sale-priced product.
 *
 * This test ensures that when a sale item is added to the basket, the subtotal and final price on the basket page
 * correctly reflect the sale pricing with applied reductions. It serves as a key regression test for the
 * basket calculation logic with sale products that have applied reductions with category "sale".
 */
test('C2167320 Verify Basket Price summary - sale product', async ({
  header,
  basketPage,
  countryDetector,
  page,
  storefrontAPIClient,
}) => {
  await test.step('Add sale product to Basket', async () => {
    const hasSaleReduction = (variant: Variant) =>
      variant.price.appliedReductions.some(
        (reduction) => reduction.category === 'sale',
      )

    const skippedProductIds = new Set<number>()
    const MAX_PRODUCT_ATTEMPTS = 8
    let selectedProduct: Product | undefined
    let selectedVariant: Variant | undefined

    for (let attempt = 0; attempt < MAX_PRODUCT_ATTEMPTS; attempt++) {
      const productData = await storefrontAPIClient.findProduct(
        (product) =>
          !skippedProductIds.has(product.id) &&
          isProductSellableNow(product) &&
          (product.variants?.some(
            (variant) =>
              hasSaleReduction(variant) && isVariantBuyableNow(variant),
          ) ??
            false),
      )

      if (!productData) {
        break
      }

      const candidateVariants = (productData.variants ?? []).filter(
        (variant) => hasSaleReduction(variant) && isVariantBuyableNow(variant),
      )

      for (const variant of candidateVariants) {
        try {
          await basketPage.addProductToBasket(variant.id, 1)
          selectedProduct = productData
          selectedVariant = variant
          break
        } catch (error) {
          const errorMessage = String(error)
          if (
            errorMessage.includes('Variant out of stock') ||
            errorMessage.includes('VARIANT_OUT_OF_STOCK')
          ) {
            continue
          }
          throw error
        }
      }

      if (selectedVariant) {
        break
      }

      skippedProductIds.add(productData.id)
    }

    test.skip(
      !selectedProduct || !selectedVariant,
      'No sale product with a currently addable variant found - skipping test',
    )

    console.log(
      `[Basket Test] Running with sale product ID: ${selectedProduct?.id}, variant ID: ${selectedVariant?.id}`,
    )
    await countryDetector.closeModal()

    await page.reload() // reload the page to update the basket page after adding the product via RPC
    await page.waitForLoadState('networkidle')
    await countryDetector.closeModal()

    await header.headerBasketButton.first().waitFor()
    await header.headerBasketButton.first().click()

    await basketPage.basketProductCard.waitFor()
    await page.waitForLoadState('networkidle')

    await expect(header.basketNumItems).toHaveText('1')
  })

  await test.step('Check sale product price summary', async () => {
    await basketPage.priceFinal.waitFor()
    await basketPage.assertBasketPriceSummary('sale')
  })
})

/**
 * Verifies that the basket quantity selector works correctly for products with limited stock (more than 2 items and less than 10 items).
 *
 * This test ensures that when a product with limited stock is added to the basket, the quantity selector
 * properly enforces the maximum available quantity and disables the increase button when the limit is reached.
 * The test also verifies that the quantity selector works correctly when the quantity is decreased.
 * It serves as a regression test for the basket quantity selector functionality with stock constraints.
 */
test('C2162487 Verify Basket Quantity Selector with limited product quantity', async ({
  header,
  basketPage,
  countryDetector,
  page,
  storefrontAPIClient,
}) => {
  let addedQuantity = 0
  let maxQuantity = 0

  await test.step('Find and add product with limited stock to basket', async () => {
    const skippedProductIds = new Set<number>()
    const MAX_PRODUCT_ATTEMPTS = 8
    let selectedProduct: Product | undefined
    let selectedVariant: Variant | undefined

    for (let attempt = 0; attempt < MAX_PRODUCT_ATTEMPTS; attempt++) {
      const productData = await storefrontAPIClient.findProduct(
        (product) =>
          !skippedProductIds.has(product.id) &&
          isProductSellableNow(product) &&
          (product.variants?.some(
            (variant) =>
              isVariantBuyableNow(variant) &&
              variant.stock.quantity > 2 &&
              variant.stock.quantity < 10,
          ) ??
            false),
      )

      if (!productData) {
        break
      }

      const candidateVariants = (productData.variants ?? []).filter(
        (variant) =>
          isVariantBuyableNow(variant) &&
          variant.stock.quantity > 2 &&
          variant.stock.quantity < 10,
      )

      for (const variant of candidateVariants) {
        const candidateMaxQuantity = variant.stock.quantity
        const candidateAddedQuantity = candidateMaxQuantity - 1

        try {
          await basketPage.addProductToBasket(
            variant.id,
            candidateAddedQuantity,
          )
          selectedProduct = productData
          selectedVariant = variant
          maxQuantity = candidateMaxQuantity
          addedQuantity = candidateAddedQuantity
          break
        } catch (error) {
          const errorMessage = String(error)
          if (
            errorMessage.includes('Variant out of stock') ||
            errorMessage.includes('VARIANT_OUT_OF_STOCK')
          ) {
            continue
          }
          throw error
        }
      }

      if (selectedVariant) {
        break
      }

      skippedProductIds.add(productData.id)
    }

    test.skip(
      !selectedProduct || !selectedVariant,
      'No limited-stock product with a currently addable variant found - skipping test',
    )

    console.log(
      `[Basket Test] Running with product ID: ${selectedProduct?.id}, variant ID: ${selectedVariant?.id}, max quantity: ${maxQuantity}`,
    )

    await page.reload() // reload the page to update the basket page after adding the product via RPC
    await page.waitForLoadState('networkidle')
    await countryDetector.closeModal()

    await header.headerBasketButton.first().waitFor()
    await header.headerBasketButton.first().click()
    await page.waitForLoadState('networkidle')
    await basketPage.basketProductCard.first().waitFor()

    await expect(header.basketNumItems).toHaveText(String(addedQuantity))
    await expect(basketPage.quantityValue).toHaveText(String(addedQuantity))
  })

  await test.step('Increase the quantity', async () => {
    await basketPage.buttonQuantityIncrease.click()

    const increasedQuantity = addedQuantity + 1
    await expect(basketPage.quantityValue).toHaveText(String(increasedQuantity))
    await expect(basketPage.buttonQuantityIncrease).toBeDisabled()
    await expect(basketPage.buttonQuantityDecrease).toBeEnabled()
    await expect(header.basketNumItems).toHaveText(String(increasedQuantity))
  })

  await test.step('Decrease the quantity', async () => {
    await basketPage.buttonQuantityDecrease.click()

    await expect(basketPage.quantityValue).toHaveText(String(addedQuantity))
    await expect(basketPage.buttonQuantityIncrease).toBeEnabled()
    await expect(header.basketNumItems).toHaveText(String(addedQuantity))
  })
})

/**
 * Verifies that the basket quantity selector works correctly for products with high stock (more than 10 items).
 *
 * This test ensures that when a product with high stock is added to the basket, the quantity selector
 * allows increasing quantity up to the maximum limit (typically 10) and properly manages the increase/decrease buttons.
 * It serves as a regression test for the basket quantity selector functionality with high stock products.
 */
test('C2170821 Verify Basket Quantity Selector available quantity more than 10', async ({
  header,
  basketPage,
  countryDetector,
  page,
  storefrontAPIClient,
}) => {
  await test.step('Find and add product with high stock to basket', async () => {
    const skippedProductIds = new Set<number>()
    const MAX_PRODUCT_ATTEMPTS = 8
    let selectedProduct: Product | undefined
    let selectedVariant: Variant | undefined

    for (let attempt = 0; attempt < MAX_PRODUCT_ATTEMPTS; attempt++) {
      const productData = await storefrontAPIClient.findProduct(
        (product) =>
          !skippedProductIds.has(product.id) &&
          isProductSellableNow(product) &&
          (product.variants?.some(
            (variant) =>
              isVariantBuyableNow(variant) && variant.stock.quantity > 10,
          ) ??
            false),
      )

      if (!productData) {
        break
      }

      const candidateVariants = (productData.variants ?? []).filter(
        (variant) =>
          isVariantBuyableNow(variant) && variant.stock.quantity > 10,
      )

      for (const variant of candidateVariants) {
        try {
          await basketPage.addProductToBasket(variant.id, 9)
          selectedProduct = productData
          selectedVariant = variant
          break
        } catch (error) {
          const errorMessage = String(error)
          if (
            errorMessage.includes('Variant out of stock') ||
            errorMessage.includes('VARIANT_OUT_OF_STOCK')
          ) {
            continue
          }
          throw error
        }
      }

      if (selectedVariant) {
        break
      }

      skippedProductIds.add(productData.id)
    }

    test.skip(
      !selectedProduct || !selectedVariant,
      'No high-stock product with a currently addable variant found - skipping test',
    )

    console.log(
      `[Basket Test] Running with high stock product ID: ${selectedProduct?.id}, variant ID: ${selectedVariant?.id}`,
    )

    await page.reload() // reload the page to update the basket page after adding the product via RPC
    await page.waitForLoadState('networkidle')
    await countryDetector.closeModal()

    await header.headerBasketButton.first().waitFor()
    await header.headerBasketButton.first().click()
    await page.waitForLoadState('networkidle')
    await basketPage.basketProductCard.first().waitFor()

    await expect(header.basketNumItems).toHaveText('9')
    await expect(basketPage.quantityValue).toHaveText('9')
    await expect(basketPage.buttonQuantityDecrease).toBeEnabled()
    await expect(basketPage.buttonQuantityIncrease).toBeEnabled()
  })

  await test.step('Increase the quantity to reach the maximum of 10', async () => {
    await basketPage.buttonQuantityIncrease.click()

    await expect(basketPage.quantityValue).toHaveText('10')
    await expect(basketPage.buttonQuantityIncrease).toBeDisabled()
    await expect(basketPage.buttonQuantityDecrease).toBeEnabled()
    await expect(header.basketNumItems).toHaveText('10')
  })

  await test.step('Decrease the quantity to reach 9', async () => {
    await basketPage.buttonQuantityDecrease.click()

    await expect(basketPage.quantityValue).toHaveText('9')
    await expect(basketPage.buttonQuantityIncrease).toBeEnabled()
    await expect(basketPage.buttonQuantityDecrease).toBeEnabled()
    await expect(header.basketNumItems).toHaveText('9')
  })
})

/**
 * Verifies that the header basket icon no longer opens a preview flyout on hover.
 * The mini-basket flyout was removed in favor of the add-to-basket slide-in and the
 * basket page, so hovering the icon must have no action.
 */
test('C2167371 Verify Basket icon has no hover flyout', async ({
  page,
  header,
  homePage,
  countryDetector,
}) => {
  test.skip(isMobile(page), 'Test only for desktop browsers')

  await homePage.navigate(page, ROUTES.home, 'networkidle')
  await countryDetector.closeModal()

  await header.headerBasketButton.scrollIntoViewIfNeeded()
  await header.headerBasketButton.hover()

  // The account flyout keeps a `popover-content` node mounted at all times, so
  // an unscoped assertion on it would pass regardless. Scope to the basket link
  // instead, and check the testids that only the removed flyout ever rendered.
  await expect(
    page.getByTestId('popoverContainer').filter({
      has: page.getByTestId('basket-link'),
    }),
  ).toHaveCount(0)
  await expect(page.getByTestId('basket-preview-flyout')).toHaveCount(0)
  await expect(page.getByTestId('basket-popover-go-to-basket')).toHaveCount(0)
})

/**
 * Verifies the basket page exposes the expected SEO meta tags.
 * The title is shop copy in the shop's language, so the test only expects a non-empty title.
 */
test('C2638903 Verify Basket page exposes noindex SEO meta tags', async ({
  basketPage,
  page,
  countryDetector,
}) => {
  await basketPage.navigate(page, ROUTES.basket, 'networkidle')
  await countryDetector.closeModal()
  await basketPage.emptyState.waitFor()

  await expect(page).toHaveTitle(/\S/)
  await verifySeoMetaTags(page, {
    robots: BASKET_TEST_DATA.seoRobots,
  })
})

/** The attempts per promotion, so one promotion with many products cannot use up the whole budget. */
const MAX_ATTEMPTS_PER_PROMOTION = 5

/**
 * The attempts in total. Every attempt adds a product to the basket and reads it back, which
 * takes several seconds, and the test has to end in a skip before its timeout.
 */
const MAX_ATTEMPTS_IN_TOTAL = 10

/**
 * Verifies the price summary of a basket that holds a product with a promotion discount.
 *
 * Prerequisite: the shop has an active promotion with an automatic discount, no tiers and no
 * promotion code, whose conditions list a category that holds a product that can be bought. The
 * test reads the active promotions from the Storefront API and adds one product of such a category
 * at a time until the basket shows a promotion discount. It skips only when no promotion lists a
 * readable category. When one does and no product gets its discount, for example after the
 * catalog was replaced and the promotions still list the old categories, it fails with the
 * product IDs it tried, because a skip would hide it.
 */
test('C2167321 Verify Basket Price summary - promotion product', async ({
  header,
  basketPage,
  countryDetector,
  page,
  storefrontAPIClient,
}) => {
  // Each attempt costs a basket round trip, and the first products of a category can lack a
  // condition of the promotion, such as its color.
  test.slow()

  await test.step('Add a promotion product to Basket', async () => {
    const promotions = (await storefrontAPIClient.getActivePromotions()).filter(
      (promotion) =>
        promotion.effect.type === 'automatic_discount' &&
        !promotion.tiers?.length &&
        !promotion.code,
    )
    const skippedProductIds = new Set<number>()
    const promotionsWithoutProduct: string[] = []
    let selectedProduct: Product | undefined
    let attempts = 0

    await countryDetector.closeModal()

    for (const promotion of promotions) {
      const categoryIds = new Set(
        storefrontAPIClient.getPromotionCategoryIds(promotion),
      )
      if (categoryIds.size === 0) {
        continue
      }

      const isInPromotionCategory = (product: Product) =>
        product.categories?.some((path) =>
          path.some((category) => categoryIds.has(category.categoryId)),
        ) ?? false

      for (
        let attempt = 0;
        attempt < MAX_ATTEMPTS_PER_PROMOTION &&
        attempts < MAX_ATTEMPTS_IN_TOTAL;
        attempt++
      ) {
        attempts++
        const productData = await storefrontAPIClient.findProduct(
          (product) =>
            !skippedProductIds.has(product.id) &&
            isProductSellableNow(product) &&
            isInPromotionCategory(product) &&
            (product.variants?.some(isVariantBuyableNow) ?? false),
          // A promotion can list a category the shop does not show.
          { includeHiddenCategories: true },
        )

        if (!productData) {
          promotionsWithoutProduct.push(
            `${promotion.name} (categories ${[...categoryIds].join(', ')})`,
          )
          break
        }

        const variant = productData.variants!.find(isVariantBuyableNow)!

        if (!(await basketPage.tryAddProductToBasket(variant.id))) {
          skippedProductIds.add(productData.id)
          continue
        }

        await basketPage.navigate(page, ROUTES.basket, 'networkidle')
        await countryDetector.closeModal()
        await basketPage.basketProductCard.waitFor()

        // The conditions are expression text that the test does not evaluate, so the basket
        // decides whether a promotion applies to this product. A campaign reduction alone does
        // not count.
        const hasPromotionDiscount = await basketPage.hasPromotionDiscount()

        if (hasPromotionDiscount) {
          selectedProduct = productData
          break
        }

        skippedProductIds.add(productData.id)
        await basketPage.removeItemFromBasket()
        // The removal runs after the click, and a product added meanwhile would be lost with it.
        await basketPage.emptyState.waitFor()
      }

      if (selectedProduct || attempts >= MAX_ATTEMPTS_IN_TOTAL) {
        break
      }
    }

    const skipDetails = [
      skippedProductIds.size > 0
        ? `Tried product IDs ${[...skippedProductIds].join(', ')}, each out of stock or without a promotion discount in the basket.`
        : '',
      promotionsWithoutProduct.length > 0
        ? `No untried buyable product in the categories of: ${promotionsWithoutProduct.join('; ')}.`
        : '',
    ]
      .filter(Boolean)
      .join(' ')
    // Nothing to test without a promotion that lists a category: that is a gap and the test skips.
    // A promotion that lists a category while no product gets its discount is something the shop
    // has to fix, so the test fails and names what it tried instead of ending in a skip.
    const promotionsWithCategories = promotions.filter(
      (promotion) =>
        storefrontAPIClient.getPromotionCategoryIds(promotion).length > 0,
    )
    skipForCatalogGap(
      'C2167321',
      promotionsWithCategories.length === 0,
      'Catalog gap: no active automatic promotion without tiers or a code lists a readable category.',
    )

    expect(
      selectedProduct,
      `No product got a promotion discount in the basket after ${attempts} attempts, although ${promotionsWithCategories.length} active promotion(s) list a category. ${skipDetails} A 429 or timeout earlier in the log means a shop rate limit, so run it again first.`,
    ).toBeDefined()

    console.log(
      `[Basket Test] Running with promotion product ID: ${selectedProduct?.id}`,
    )
    await expect(header.basketNumItems).toHaveText('1')
  })

  await test.step('Check promotion product price summary', async () => {
    await basketPage.openPromotionSummary()
    await expect(basketPage.priceFinal.first()).toBeVisible()
    await basketPage.assertBasketPriceSummary('promotion')
  })
})
