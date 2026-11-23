import { expect } from '@playwright/test'
import type { Product, ProductCategory, Variant } from '@scayle/storefront-api'
import { test } from '../../fixtures/fixtures'
import { PDP_E2E, ROUTES } from '../../support/constants'
import {
  isProductSellableNow,
  isVariantBuyableNow,
  isVariantOutOfStock,
  setupProductDetailTest,
} from '../../support/productTestHelpers'
import {
  getHomepageUrl,
  verifySeoMetaTags,
  navigateToPlp,
  isMobile,
} from '../../support/utils'

/**
 * @file Contains end-to-end tests for the Product Detail Page (PDP),
 * verifying elements like name, brand, price, wishlist functionality,
 * page title, and SEO meta tags.
 */

/**
 * Verifies that the product brand, name, regular price, and
 * tax information are visible on the Product Detail Page.
 *
 * Test Criteria:
 * - Product must be active
 * - Product must be in stock (at least one variant with stock > 0)
 */
test('C2141594: Verify PDP name brand, price and image', async ({
  productDetailPage,
  countryDetector,
  page,
  storefrontAPIClient,
}) => {
  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      product.isActive && // must be active
      (product.variants?.some((variant) => variant.stock?.quantity > 0) ??
        false), // must be in stock
  )

  const product = await setupProductDetailTest(
    productData,
    'No active product in stock found - skipping test',
    { page, productDetailPage, countryDetector },
  )

  console.log(`[PDP Test] Running test with product ID: ${product.id}`)
  await productDetailPage.h1.waitFor()
  // Primary media differs by viewport: the swipe slider below 640px, the image
  // grid from 640px up (both are in the DOM, only one is visible).
  const primaryMedia = isMobile(page)
    ? productDetailPage.mainImageSlide
    : productDetailPage.productImageGrid
  await primaryMedia.waitFor()

  await expect(productDetailPage.productBrand).toBeVisible()
  await expect(productDetailPage.productName).toBeVisible()
  await expect(primaryMedia).toBeVisible()
  await expect(productDetailPage.priceRegular.first()).toBeVisible()
  await expect(productDetailPage.taxInfo).toBeVisible()
})

/**
 * C2141598: Verifies that a user can add a product to their Wishlist from the
 * Product Detail Page and that the Wishlist item counter in the header is updated.
 * It also verifies the removal of the product from the Wishlist, checking if the
 * counter is updated accordingly.
 *
 * Test Criteria:
 * - Product must be active
 * - Product must be in stock (at least one variant with stock > 0)
 */
test('C2141598: Verify PDP add and remove to/from Wishlist', async ({
  productDetailPage,
  header,
  page,
  countryDetector,
  storefrontAPIClient,
}) => {
  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      isProductSellableNow(product) &&
      (product.variants?.some(isVariantBuyableNow) ?? false),
  )

  const product = await setupProductDetailTest(
    productData,
    'No sellable product with a buyable variant found - skipping test',
    { page, productDetailPage, countryDetector },
  )

  console.log(`[PDP Test] Running test with product ID: ${product.id}`)
  await productDetailPage.h1.waitFor()

  await test.step('Adding product to Wishlist', async () => {
    await productDetailPage.assertAddToWishlistIconVisibility()
    await page.waitForLoadState('networkidle')
    await productDetailPage.addProductToWishlist()
    await productDetailPage.assertRemoveFromWishlistIconVisibility()

    await expect(header.wishlistNumItems).toHaveText('1')
  })

  await test.step('Removing product from Wishlist', async () => {
    await productDetailPage.removeProductFromWishlist()

    await expect(header.wishlistNumItems).toBeHidden()
  })
})

/**
 * Verifies the presence and correctness of specific SEO meta tags
 * (robots and canonical) on the Product Detail Page, checks if the
 * main headline (H1) contains the page title and that the product name
 * is contained in the SEO page title.
 */
test('C2141150 C2141757 Verify PDP SEO data', async ({
  productDetailPage,
  countryDetector,
  page,
  mobileNavigation,
  mainNavigation,
  breadcrumb,
  productListingPage,
  storefrontAPIClient,
}) => {
  await productDetailPage.navigate(page, ROUTES.home, 'networkidle')
  await page.waitForLoadState('networkidle')
  await countryDetector.closeModal()
  await navigateToPlp(
    page,
    mobileNavigation,
    mainNavigation,
    storefrontAPIClient,
  )
  await page.keyboard.press('Escape')
  await breadcrumb.breadcrumbCategoryActive.waitFor()
  await productListingPage.productImage.first().click()
  await productDetailPage.h1.waitFor()

  const pageTitle = (await productDetailPage.pageTitle.textContent()) as string
  const pageTitleSEO = await page.title()
  const productName = await productDetailPage.productName.textContent()

  await verifySeoMetaTags(page, {
    robots: PDP_E2E.seoRobots,
    canonical: page.url(),
  })
  await expect(productDetailPage.h1).toBeAttached()
  await expect(productDetailPage.h1).toContainText(pageTitle)
  expect(pageTitleSEO).toContain(productName)
})

/**
 * Verifies that a multi-variant product can be successfully added to the basket from the PDP.
 *
 * Test Criteria:
 * - Product must have multiple variants (more than 1)
 * - Product must be sellable now
 * - Product must have at least one buyable variant
 *
 * The test finds a product meeting these criteria, opens its PDP, selects a buyable
 * variant via the size picker, adds it to the basket, and asserts that the basket
 * count is correct and the confirmation slide-in shows the added product.
 */
test('C2141595: Verify PDP add to Basket for multi variant product', async ({
  page,
  productDetailPage,
  header,
  addToBasketSlideIn,
  countryDetector,
  storefrontAPIClient,
}) => {
  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      isProductSellableNow(product) &&
      (product.variants?.length ?? 0) > 1 &&
      (product.variants?.some(isVariantBuyableNow) ?? false),
  )

  test.skip(
    !productData,
    'No sellable multi-variant product with a buyable variant found - skipping test',
  )

  const buyableVariant = (productData as Product).variants!.find(
    isVariantBuyableNow,
  )
  test.skip(!buyableVariant, 'No buyable variant found on selected product')

  const productId = productData!.id

  console.log(`[PDP Test] Running test with product ID: ${productId}`)

  await setupProductDetailTest(
    productData,
    'No sellable multi-variant product with a buyable variant found - skipping test',
    { page, productDetailPage, countryDetector },
  )
  await productDetailPage.variantPicker.waitFor()
  await productDetailPage.productName.waitFor()

  const productName = await productDetailPage.productName.textContent()

  await productDetailPage.chooseProductVariant()
  await productDetailPage.addProductToBasket({ dismissSlideIn: false })

  await addToBasketSlideIn.assertIsVisible()
  await expect(addToBasketSlideIn.productCard).toContainText(
    productName as string,
  )
  // The header count must already reflect the add by the time the slide-in opens.
  await expect(header.basketNumItems).toHaveText('1')

  await addToBasketSlideIn.dismiss()
})

/**
 * Verifies that a single-variant product can be successfully added to the basket from the PDP.
 *
 * Test Criteria:
 * - Product must have only one variant
 * - Product must be in stock
 *
 * The test finds a product meeting these criteria, navigates to its PDP, selects a variant,
 * adds it to the basket, and asserts that the basket count is correct and the confirmation
 * slide-in shows the added product and closes on Escape.
 */
test('C2141596: Verify PDP add to Basket for single variant product', async ({
  page,
  productDetailPage,
  header,
  addToBasketSlideIn,
  countryDetector,
  storefrontAPIClient,
}) => {
  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      product.isActive && // must be active
      product.variants?.length === 1, // must have exactly one variant
  )

  const product = await setupProductDetailTest(
    productData,
    'No product with single variant found - skipping test',
    { page, productDetailPage, countryDetector },
  )

  console.log(`[PDP Test] Running test with product ID: ${product.id}`)
  await productDetailPage.variantPicker.waitFor()
  await productDetailPage.productName.waitFor()

  const productName = await productDetailPage.productName.textContent()

  await productDetailPage.addProductToBasket({ dismissSlideIn: false })
  await header.basketNumItems.waitFor()

  await expect(header.basketNumItems).toHaveText('1')
  await addToBasketSlideIn.assertIsVisible()
  await expect(addToBasketSlideIn.productCard).toContainText(
    productName as string,
  )
  await expect(addToBasketSlideIn.goToBasketButton).toBeVisible()
  await expect(addToBasketSlideIn.goToCheckoutButton).toBeVisible()

  await addToBasketSlideIn.dismissWithEscape()
})

/**
 * Verifies that a user can click on a product sibling on the PDP and successfully navigate to that sibling's page.
 *
 * Test Criteria:
 * - Product must have multiple siblings (more than 1)
 * - Product must be in stock
 *
 * The test finds a product meeting these criteria, navigates to its PDP, clicks a random sibling, and asserts
 * that the new product's ID is reflected in the URL.
 */
test('C2266540: Verify PDP product siblings navigation', async ({
  page,
  productDetailPage,
  countryDetector,
  storefrontAPIClient,
}) => {
  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      product.isActive && // must be active
      product.siblings!.length > 1, // must have multiple siblings
  )

  const product = await setupProductDetailTest(
    productData,
    'No product with siblings found - skipping test',
    { page, productDetailPage, countryDetector },
  )

  console.log(`[PDP Test] Running with initial product ID: ${product.id}`)

  await test.step('Click a random product sibling and verify URL change', async () => {
    const siblingCount = await productDetailPage.productSiblingLink.count()

    const randomSiblingIndex =
      Math.floor(Math.random() * (siblingCount - 1)) + 1
    const randomSiblingButton =
      productDetailPage.productSiblingLink.nth(randomSiblingIndex)

    const siblingHref = await randomSiblingButton.getAttribute('href')
    expect(siblingHref).not.toBeNull()

    const siblingProductId = siblingHref!.split('-').pop()

    await productDetailPage.clickProductSiblingLink(randomSiblingButton)
    await page.waitForLoadState('networkidle')

    expect(page.url()).toContain(siblingProductId as string)
  })

  await test.step('Verify new PDP is loaded and interactive', async () => {
    await productDetailPage.variantPicker.waitFor()

    await expect(productDetailPage.productName).toBeVisible()
  })
})

/**
 * Verifies that a PDP quantity selector is working correctly.
 *
 * Test Criteria:
 * - Product must be sellable now (same gate as multi-variant basket test C2141595)
 * - Product must have multiple variants
 * - At least one variant must be buyable now with stock strictly greater than 10 (room to increase quantity)
 *
 * The test finds a product meeting these criteria, opens the PDP, selects that variant via the picker,
 * then asserts that increasing and decreasing quantity works as expected.
 */
test('C2141597: Verify PDP quantity selector', async ({
  productDetailPage,
  header,
  page,
  countryDetector,
  storefrontAPIClient,
}) => {
  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      isProductSellableNow(product) &&
      (product.variants?.length ?? 0) > 1 &&
      (product.variants?.some(
        (variant) =>
          isVariantBuyableNow(variant) && (variant.stock?.quantity ?? 0) > 10,
      ) ??
        false),
  )

  test.skip(
    !productData,
    'No sellable multi-variant product with a buyable high-stock variant found - skipping test',
  )

  const highStockVariant = (productData as Product).variants!.find(
    (variant) =>
      isVariantBuyableNow(variant) && (variant.stock?.quantity ?? 0) > 10,
  )

  test.skip(
    !highStockVariant,
    'No buyable high-stock variant found on selected product',
  )

  const selectedVariant = highStockVariant!
  const productId = productData!.id

  console.log(`[PDP Test] Running test with product ID: ${productId}`)

  await setupProductDetailTest(
    productData,
    'No sellable multi-variant product with a buyable high-stock variant found - skipping test',
    { page, productDetailPage, countryDetector },
  )
  await productDetailPage.variantPicker.waitFor()
  await productDetailPage.productName.waitFor()

  await productDetailPage.variantPicker.click({ force: true })
  await productDetailPage.clickVariantOption(String(selectedVariant.id))
  await expect(productDetailPage.quantityValue).toHaveText('1')
  await expect(productDetailPage.quantityMinus).toBeDisabled()
  await expect(productDetailPage.quantityPlus).toBeEnabled()

  await productDetailPage.clickQuantityPlus()
  await productDetailPage.clickQuantityPlus()

  await expect(productDetailPage.quantityMinus).toBeEnabled()
  await expect(productDetailPage.quantityValue).toHaveText('3')

  await productDetailPage.clickQuantityMinus()
  await expect(productDetailPage.quantityValue).toHaveText('2')

  await productDetailPage.addProductToBasket()
  await expect(header.basketNumItems).toHaveText('2')
})

/**
 * Verifies that the PDP URL correctly updates with the variant ID parameter when a user
 * selects a specific variant from a multi-size product.
 *
 * Test Criteria:
 * - Product must be sellable now (same gate as C2141597 and wishlist PDP tests)
 * - Product must have multiple variants
 * - At least one variant must be buyable now
 *
 * The test picks a buyable variant (prefers the second buyable when two exist) so the
 * selection is more likely to change the URL than re-selecting the default size alone.
 */
test('C2181798: Verify PDP URL Variant ID parameter for multi-size available variant', async ({
  productDetailPage,
  countryDetector,
  page,
  storefrontAPIClient,
}) => {
  const product = await storefrontAPIClient.findProduct(
    (p) =>
      isProductSellableNow(p) &&
      (p.variants?.length ?? 0) > 1 &&
      (p.variants?.some(isVariantBuyableNow) ?? false),
  )

  test.skip(
    !product,
    'No sellable multi-variant product with a buyable variant found - skipping test',
  )

  const buyableVariants = product!.variants!.filter(isVariantBuyableNow)
  test.skip(
    buyableVariants.length < 1,
    'No buyable variant on selected product - skipping test',
  )

  const targetVariant =
    buyableVariants.length > 1 ? buyableVariants[1] : buyableVariants[0]
  const variantId = targetVariant.id

  console.log(
    `[PDP Test] Running with product ID: ${product!.id} and variant ID: ${variantId}`,
  )
  const variantIdUrl = `?variantId=${variantId.toString()}`

  await setupProductDetailTest(
    product,
    'No sellable multi-variant product with a buyable variant found - skipping test',
    { page, productDetailPage, countryDetector },
  )

  await productDetailPage.variantPicker.waitFor()
  expect(page.url()).not.toContain(variantIdUrl)

  await productDetailPage.variantPicker.click({ force: true })
  await productDetailPage.clickVariantOption(variantId.toString())

  await expect(async () => {
    expect(page.url()).toContain(variantIdUrl)
  }).toPass({ timeout: 15_000 })
})

/**
 * Verifies that the deferred props replies keep a size picked before they arrive, in the
 * URL and in the picker, and that neither the pick nor the replies add a history entry.
 *
 * Every deferred props request is held until the size is picked, the order a slow
 * connection or device produces. A reply used to bring back the URL the page had when its
 * request went out and push it as a new history entry, which dropped the picked
 * `variantId`, or put back the one of a shared link. The pick requests the deferred props
 * again, so which URL stays depends on the reply that lands last. The history entries
 * are added either way, which makes them the check that fails every time.
 *
 * Test Criteria:
 * - Product must be sellable now
 * - Product must have at least two buyable variants
 */
for (const { name, query } of [
  { name: 'from a bare URL', query: () => '' },
  {
    name: 'from a shared link',
    query: (sharedVariant: Variant) => `?variantId=${sharedVariant.id}`,
  },
]) {
  test(`Verify PDP keeps the picked size when the deferred props arrive late, opened ${name}`, async ({
    productDetailPage,
    countryDetector,
    page,
    storefrontAPIClient,
  }) => {
    const product = await storefrontAPIClient.findProduct(
      (p) =>
        isProductSellableNow(p) &&
        (p.variants?.filter(isVariantBuyableNow).length ?? 0) > 1,
    )
    test.skip(
      !product,
      'No sellable product with two buyable variants found - skipping test',
    )

    const [sharedVariant, pickedVariant] =
      product!.variants!.filter(isVariantBuyableNow)
    const path = `p/p-${product!.id}${query(sharedVariant)}`
    const pickedVariantUrl = new RegExp(`variantId=${pickedVariant.id}`)

    let heldRequests = 0
    let releaseDeferredProps = () => {}
    const deferredPropsHeld = new Promise<void>((resolve) => {
      releaseDeferredProps = resolve
    })
    await page.route('**/*', async (route) => {
      if (route.request().headers()['x-inertia-partial-data']) {
        heldRequests += 1
        await deferredPropsHeld
      }
      await route.fallback()
    })

    let historyLength = 0

    await test.step('Pick a size while the deferred props are held', async () => {
      // Not `networkidle`: the held requests keep the network busy.
      await productDetailPage.navigate(page, path, 'domcontentloaded')
      // Inertia requests the deferred props once the page has mounted, so a
      // held request also means the picker is hydrated.
      await expect.poll(() => heldRequests).toBeGreaterThan(0)
      await countryDetector.closeModal()
      historyLength = await page.evaluate(() => history.length)

      await productDetailPage.openVariantPicker()
      await productDetailPage.clickVariantOption(String(pickedVariant.id))

      await expect(page).toHaveURL(pickedVariantUrl)
    })

    await test.step('Release the deferred props and keep the size', async () => {
      releaseDeferredProps()
      await productDetailPage.waitForDeferredReloads()

      await expect(page).toHaveURL(pickedVariantUrl)
      await expect(
        productDetailPage.getVariant(String(pickedVariant.id)),
      ).toHaveAttribute('aria-selected', 'true')
      expect(await page.evaluate(() => history.length)).toBe(historyLength)
    })
  })
}

/**
 * Verifies that the PDP URL does not contain variant ID parameter for one-size products.
 *
 * Test Criteria:
 * - Product must have only one variant
 * - Product must be in stock
 *
 * The test navigates to a single-variant product PDP and verifies that the variant is pre-selected and that the URL does not
 * include a variantId parameter. This ensures that one-size products maintain
 * clean URLs without unnecessary variant parameters.
 */
test('C2181801: Verify PDP URL Variant ID parameter for one-size product', async ({
  productDetailPage,
  countryDetector,
  page,
  storefrontAPIClient,
}) => {
  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      product.isActive && // must be active
      product.variants?.length === 1, // must have exactly one variant
  )

  test.skip(
    !productData,
    'No product with single variant found - skipping test',
  )

  const productId = productData!.id
  const variantId = productData!.variants?.[0]?.id?.toString()
  console.log(`[PDP Test] Running test with product ID: ${productId}`)

  await setupProductDetailTest(
    productData,
    'No product with single variant found - skipping test',
    { page, productDetailPage, countryDetector },
  )

  await test.step('Visit one-size available product PDP and check URL parameter', async () => {
    await productDetailPage.variantPicker.waitFor()

    expect(page.url()).not.toContain('variantId')
    await expect(productDetailPage.getVariant(variantId)).toBeAttached()
  })
})

/**
 * Verifies that the PDP URL correctly contains the variant ID parameter when navigating
 * to a multi-size product with an out-of-stock variant, and that the add to basket button
 * is disabled for that variant.
 *
 * Test Criteria:
 * - Product must be sellable now (so the PDP is a normal sellable product, not future/past)
 * - Product must have multiple variants
 * - At least one variant must be out of stock: stock quantity zero and not sellable without stock
 * - At least one other variant must be buyable now (true multi-size with an available size)
 *
 * The test finds a product meeting these criteria, navigates to its PDP with the out-of-stock
 * variant ID in the URL, and verifies that the URL contains the variantId parameter
 * and the add to basket button is disabled.
 */
test('C2181799: Verify PDP for multi-size sold-out variant', async ({
  productDetailPage,
  countryDetector,
  page,
  storefrontAPIClient,
}) => {
  const product = await storefrontAPIClient.findProduct(
    (product) =>
      isProductSellableNow(product) &&
      product.variants!.length > 1 &&
      product.variants!.some(
        (v) => isVariantOutOfStock(v) && v.attributes?.size?.values,
      ) &&
      product.variants!.some(isVariantBuyableNow),
  )

  test.skip(
    !product,
    'No sellable multi-variant product with an out-of-stock sized variant and a buyable variant found - skipping test',
  )

  const soldOutVariant = product!.variants!.find(
    (v) => isVariantOutOfStock(v) && v.attributes?.size?.values,
  )

  test.skip(
    !soldOutVariant,
    'No out-of-stock variant with size found on selected product',
  )

  const outOfStockVariant = soldOutVariant!

  const sizeValue = Array.isArray(outOfStockVariant.attributes!.size!.values)
    ? outOfStockVariant.attributes!.size!.values[0]
    : outOfStockVariant.attributes!.size!.values

  test.skip(!sizeValue?.label, 'No size label found - skipping test')

  console.log(
    `[PDP Test] Running test with product ID: ${
      product!.id
    } and out-of-stock variant ID: ${outOfStockVariant.id}`,
  )

  await setupProductDetailTest(
    product,
    'No sellable multi-variant product with an out-of-stock sized variant and a buyable variant found - skipping test',
    {
      page,
      productDetailPage,
      countryDetector,
      path: `p/p-${product!.id}?variantId=${outOfStockVariant.id}`,
    },
  )
  await productDetailPage.variantPicker.waitFor()

  expect(page.url()).toContain('variantId')
  await expect(productDetailPage.addToBasketButton).toBeDisabled()
  await expect(productDetailPage.variantPicker).toContainText(sizeValue.label)
})

/**
 * Verifies that the PDP contains valid SEO product markup (JSON-LD structured data)
 * including BreadcrumbList and ProductGroup with all required fields and variants.
 *
 * Test Criteria:
 * - Product must be active
 * - Product must have more than one variant (`variesBy` is omitted for a single variant)
 * - Product must be in stock (at least one variant with stock > 0)
 */
test('C2179230, C2183601 Verify PDP SEO Product and Breadcrumb markup', async ({
  productDetailPage,
  countryDetector,
  page,
  storefrontAPIClient,
}) => {
  type JsonLdRecord = Record<string, unknown>
  const isRecord = (value: unknown): value is JsonLdRecord =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      product.isActive &&
      (product.variants?.length ?? 0) > 1 &&
      (product.variants?.some((variant) => variant.stock?.quantity > 0) ??
        false),
  )

  const product = await setupProductDetailTest(
    productData,
    'No active in-stock product with multiple variants found - skipping test',
    { page, productDetailPage, countryDetector },
  )

  console.log(`[PDP Test] Running test with product ID: ${product.id}`)
  await productDetailPage.h1.waitFor()

  // Extract JSON-LD structured data from the page
  const jsonLdData: unknown[] = await page.evaluate(() => {
    const scripts = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    )
    const allData: unknown[] = []
    scripts.forEach((script) => {
      const parsed: unknown = JSON.parse(script.textContent || '{}')
      if (Array.isArray(parsed)) {
        allData.push(...parsed)
      } else {
        allData.push(parsed)
      }
    })
    return allData
  })

  expect(jsonLdData.length).toBeGreaterThan(0)

  // Find BreadcrumbList and ProductGroup
  const breadcrumbList = jsonLdData.find(
    (item) => isRecord(item) && item['@type'] === 'BreadcrumbList',
  )
  const productGroup = jsonLdData.find(
    (item) => isRecord(item) && item['@type'] === 'ProductGroup',
  )

  await test.step('Validate BreadcrumbList structure', () => {
    expect(breadcrumbList).toBeDefined()
    expect(isRecord(breadcrumbList)).toBe(true)
    if (!isRecord(breadcrumbList)) {
      return
    }

    expect(breadcrumbList['@context']).toBe('https://schema.org')
    expect(breadcrumbList['@type']).toBe('BreadcrumbList')

    const itemListElement = breadcrumbList.itemListElement
    expect(itemListElement).toBeDefined()
    expect(Array.isArray(itemListElement)).toBe(true)
    if (!Array.isArray(itemListElement)) {
      return
    }
    expect(itemListElement.length).toBeGreaterThan(0)

    // Validate each breadcrumb item
    itemListElement.forEach((item, index) => {
      expect(isRecord(item)).toBe(true)
      if (!isRecord(item)) {
        return
      }

      expect(item['@type']).toBe('ListItem')
      expect(item.position).toBe(index + 1)
      expect(item.name).toBeDefined()
      expect(typeof item.name).toBe('string')
      expect(item.item).toBeDefined()
      expect(typeof item.item).toBe('string')
    })
  })

  await test.step('Validate ProductGroup structure', () => {
    expect(productGroup).toBeDefined()
    expect(isRecord(productGroup)).toBe(true)
    if (!isRecord(productGroup)) {
      return
    }

    expect(productGroup['@context']).toBe('https://schema.org')
    expect(productGroup['@type']).toBe('ProductGroup')
    expect(productGroup.productGroupID).toBeDefined()
    expect(productGroup.name).toBeDefined()
    expect(typeof productGroup.name).toBe('string')

    const hasVariant = productGroup.hasVariant
    expect(hasVariant).toBeDefined()
    expect(Array.isArray(hasVariant)).toBe(true)

    const variesBy = productGroup.variesBy
    expect(variesBy).toBeDefined()
    expect(Array.isArray(variesBy)).toBe(true)
  })

  await test.step('Validate Product variants structure', () => {
    expect(isRecord(productGroup)).toBe(true)
    if (!isRecord(productGroup)) {
      return
    }

    const hasVariant = productGroup.hasVariant
    expect(Array.isArray(hasVariant)).toBe(true)
    if (!Array.isArray(hasVariant)) {
      return
    }

    hasVariant.forEach((variant) => {
      expect(isRecord(variant)).toBe(true)
      if (!isRecord(variant)) {
        return
      }

      expect(variant['@type']).toBe('Product')
      expect(variant.name).toBeDefined()
      expect(typeof variant.name).toBe('string')

      // Validate offers
      const offers = variant.offers
      expect(isRecord(offers)).toBe(true)
      if (!isRecord(offers)) {
        return
      }

      expect(offers['@type']).toBe('Offer')
      expect(offers.url).toBeDefined()
      expect(typeof offers.url).toBe('string')
      expect(offers.sku).toBeDefined()
      expect(typeof offers.sku).toBe('string')
      expect(offers.price).toBeDefined()
      expect(typeof offers.price).toBe('number')
      expect(offers.priceCurrency).toBeDefined()
      expect(typeof offers.priceCurrency).toBe('string')
      expect(offers.availability).toBeDefined()
      expect(typeof offers.availability).toBe('string')
      expect(offers.itemCondition).toBeDefined()
      expect(typeof offers.itemCondition).toBe('string')
    })
  })
})

/**
 * Verifies that the product information accordion on the PDP is visible, collapsed by default,
 * expands on first click, and collapses again on second click.
 *
 * Test Criteria:
 * - Product must be active
 * - Product must be in stock (at least one variant with stock > 0)
 */
test('C2141476 Verify PDP Product information', async ({
  productDetailPage,
  countryDetector,
  page,
  storefrontAPIClient,
}) => {
  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      product.isActive &&
      (product.variants?.some((variant) => variant.stock?.quantity > 0) ??
        false),
  )

  const product = await setupProductDetailTest(
    productData,
    'No active product in stock found - skipping test',
    { page, productDetailPage, countryDetector },
  )

  console.log(`[PDP Test] Running test with product ID: ${product.id}`)
  await productDetailPage.h1.waitFor()

  await test.step('Product information accordion is visible and collapsed by default', async () => {
    const accordion = productDetailPage.productInfoAccordion.first()
    await accordion.scrollIntoViewIfNeeded()
    await accordion.waitFor()
    await expect(accordion).toBeVisible()

    const isExpanded =
      (await productDetailPage.productInfoAccordionDetails
        .first()
        .getAttribute('open')) !== null
    expect(isExpanded).toBe(false)
  })

  await test.step('Click first accordion and verify expanded state', async () => {
    await productDetailPage.clickProductInfoAccordion(0)
    await expect(
      productDetailPage.productInfoAccordionDetails.first(),
    ).toHaveAttribute('open', '')
  })

  await test.step('Click accordion again and verify collapsed state', async () => {
    await productDetailPage.clickProductInfoAccordion(0)
    await expect(
      productDetailPage.productInfoAccordionDetails.first(),
    ).not.toHaveAttribute('open')
  })
})

/**
 * Verifies that the PDP short URL is resolved to the full URL.
 * Visiting /p/p-{id} (short URL) should redirect to /p/{slug}-{id} (full URL).
 *
 * Test Criteria:
 * - Product must be active
 * - Product must be in stock (at least one variant with stock > 0)
 */
test('C2184713: Verify PDP short URL', async ({
  productDetailPage,
  countryDetector,
  page,
  storefrontAPIClient,
  baseURL,
}) => {
  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      product.isActive &&
      (product.variants?.some((variant) => variant.stock?.quantity > 0) ??
        false),
  )

  test.skip(!productData, 'No active product in stock found - skipping test')

  const productId = productData!.id
  const nameAttr = productData!.attributes?.name
  let productName: string | undefined
  if (!nameAttr) {
    productName = undefined
  } else if (Array.isArray(nameAttr.values)) {
    productName = nameAttr.values[0]?.label
  } else {
    productName = nameAttr.values?.label
  }
  const expectedSlug = (productName ?? '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[*+~.()'"!:@/#?]/g, '')
  const expectedFullPath = new URL(`p/${expectedSlug}-${productId}`, baseURL)
    .pathname
  const shortUrlPath = `p/p-${productId}`

  console.log(
    `[PDP Test] Running short URL test with product ID: ${productId}, expected full path: ${expectedFullPath}`,
  )

  await setupProductDetailTest(
    productData,
    'No active product in stock found - skipping test',
    { page, productDetailPage, countryDetector, path: shortUrlPath },
  )

  await expect(async () => {
    expect(new URL(page.url()).pathname).toBe(expectedFullPath)
  }).toPass({ timeout: 5000 })

  await productDetailPage.h1.waitFor()
  await expect(productDetailPage.productName).toBeVisible()
})

/**
 * Verifies the PDP image grid on desktop: every product image renders as a tile,
 * and clicking a tile opens the zoom overlay at that image.
 *
 * Test Criteria:
 * - Product must be active and have many images (8–10) so the grid wraps into
 *   multiple rows.
 */
test('C2139792 Verify PDP picture grid components - Desktop', async ({
  productDetailPage,
  countryDetector,
  page,
  storefrontAPIClient,
}) => {
  test.skip(isMobile(page), 'Test only for desktop browsers')

  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      product.isActive &&
      Array.isArray(product.images) &&
      product.images.length >= 8 &&
      product.images.length <= 10,
  )

  const product = await setupProductDetailTest(
    productData,
    'No active product with 8–10 images found - skipping test',
    { page, productDetailPage, countryDetector },
  )

  const imageCount = product.images!.length
  console.log(
    `[PDP Test] Running picture grid test with product ID: ${product.id} (${imageCount} images)`,
  )
  await productDetailPage.h1.waitFor()

  await productDetailPage.productGallery.waitFor()

  await test.step('Grid renders one tile per product image', async () => {
    await expect(productDetailPage.productImageGrid).toBeVisible()
    const tiles = productDetailPage.productImageGrid.getByTestId(
      /^product-grid-tile-\d+$/,
    )
    await expect(tiles).toHaveCount(imageCount)
  })

  await test.step('Clicking a tile opens the zoom overlay at that image', async () => {
    await productDetailPage.getProductGridTile(2).click()
    await expect(productDetailPage.getImageGalleryOverlayImage(2)).toBeVisible()
  })

  await test.step('Closing the overlay returns to the grid', async () => {
    await productDetailPage.imageGalleryOverlayCloseButton.click()
    await expect(productDetailPage.getImageGalleryOverlayImage(2)).toBeHidden()
    await expect(productDetailPage.productImageGrid).toBeVisible()
  })
})

/**
 * Verifies PDP image gallery (picture grid) on mobile: slider dots are displayed,
 * dot count matches image count, and swipe left/right changes the image and active dot.
 * Mobile only: slider dots are hidden on desktop (lg:hidden).
 *
 * Test Criteria:
 * - Product must be active and have many images (8–10) so multiple dots are shown.
 */
test('C2139792 Verify PDP picture grid components - Mobile', async ({
  productDetailPage,
  countryDetector,
  page,
  storefrontAPIClient,
}) => {
  test.skip(!isMobile(page), 'Test only for mobile browsers')

  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      product.isActive &&
      Array.isArray(product.images) &&
      product.images.length >= 8 &&
      product.images.length <= 10,
  )

  const product = await setupProductDetailTest(
    productData,
    'No active product with 8–10 images found - skipping test',
    { page, productDetailPage, countryDetector },
  )

  const imageCount = product.images!.length
  console.log(
    `[PDP Test] Running mobile picture grid test with product ID: ${product.id} (${imageCount} images)`,
  )
  await productDetailPage.h1.waitFor()

  const gallery = page.getByTestId('product-gallery')
  await gallery.waitFor()

  await test.step('Slider dots are displayed and count matches number of images', async () => {
    await expect(productDetailPage.imageGallerySliderDots).toBeVisible()
    const dots = productDetailPage.imageGallerySliderDots.getByTestId(
      /^image-slider-dot-\d+$/,
    )

    await expect(dots).toHaveCount(imageCount)
  })

  await test.step('Initial active dot is dot 0', async () => {
    const dot0 = productDetailPage.getImageGallerySliderDot(0)
    await expect(dot0).toHaveClass(/bg-primary/)
  })

  const mainImage = page.getByTestId('main-product-image')
  await mainImage.waitFor()

  // The slider's active dot is driven by scroll position. Use the scrollable container
  // so that the scroll event fires and activeSlide (and thus the active dot) updates.
  const scrollableSlider = mainImage.locator('.overflow-x-auto').first()

  await test.step('Swipe left loads next image and updates active dot to dot 1', async () => {
    await scrollableSlider.evaluate((el) => {
      const slideWidth = el.scrollWidth / el.children.length
      el.scrollTo({ left: slideWidth, top: 0, behavior: 'auto' })
    })
    const dot1 = productDetailPage.getImageGallerySliderDot(1)
    await expect(dot1).toHaveClass(/bg-primary/)
  })

  await test.step('Swipe right loads previous image and updates active dot to dot 0', async () => {
    await scrollableSlider.evaluate((el) => {
      el.scrollTo({ left: 0, top: 0, behavior: 'auto' })
    })
    const dot0 = productDetailPage.getImageGallerySliderDot(0)
    await expect(dot0).toHaveClass(/bg-primary/)
  })
})

/**
 * Verifies the PDP image gallery overlay: opening via image click, the slide
 * position in the footer, navigation (arrows on desktop, swipe on mobile),
 * and closing via the close button.
 *
 * Test Criteria:
 * - Product must be active and in stock
 * - Product must have multiple images (ideally 8–10) for overlay navigation
 */
test('C2139793 Verify PDP image gallery', async ({
  productDetailPage,
  countryDetector,
  page,
  storefrontAPIClient,
}) => {
  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      product.isActive &&
      (product.variants?.some((variant) => variant.stock?.quantity > 0) ??
        false) &&
      Array.isArray(product.images) &&
      product.images.length >= 8 &&
      product.images.length <= 10,
  )

  const product = await setupProductDetailTest(
    productData,
    'No active product in stock with 8–10 images found - skipping test',
    { page, productDetailPage, countryDetector },
  )

  console.log(
    `[PDP Test] Running image gallery overlay test with product ID: ${product.id} (${
      product.images!.length
    } images)`,
  )
  await productDetailPage.h1.waitFor()

  await productDetailPage.productGallery.waitFor()

  await test.step('Open the overlay and assert the first image is displayed', async () => {
    // Below 640px the overlay opens from the swipe slide; from 640px up it opens
    // from a grid tile.
    if (isMobile(page)) {
      await productDetailPage.mainImageSlide.click()
    } else {
      await productDetailPage.getProductGridTile(0).click()
    }
    await expect(productDetailPage.getImageGalleryOverlayImage(0)).toBeVisible()
  })

  // The footer copy is translated ("1 of 8", "1 von 8"), so match the two
  // numbers rather than a locale's wording. Videos inserted into the gallery
  // make this total larger than the product's image count.
  const position = productDetailPage.imageGalleryOverlayPosition
  let slideCount = 0

  await test.step('Verify the overlay footer shows the first slide', async () => {
    await expect(productDetailPage.imageGalleryOverlayFooter).toBeVisible()
    const text = (await position.innerText()).trim()
    const match = text.match(/^(\d+)\D+(\d+)$/)
    expect(match?.[1]).toBe('1')
    slideCount = Number(match?.[2])
    expect(slideCount).toBeGreaterThan(1)
    await expect(productDetailPage.imageGalleryOverlayArrowLeft).toBeVisible()
    await expect(productDetailPage.imageGalleryOverlayArrowRight).toBeVisible()
    await expect(
      productDetailPage.imageGalleryOverlayArrowLeft,
    ).toHaveAttribute('aria-disabled', 'true')
  })

  const expectSlidePosition = (current: number) =>
    expect(position).toHaveText(new RegExp(`${current}\\D+${slideCount}`))

  if (isMobile(page)) {
    await test.step('Swipe left to next image in overlay (mobile)', async () => {
      await productDetailPage.imageGalleryOverlayScrollableSlider.evaluate(
        (el) => {
          const slideWidth = el.scrollWidth / el.children.length
          el.scrollTo({ left: slideWidth, top: 0, behavior: 'auto' })
        },
      )
      await expect(
        productDetailPage.getImageGalleryOverlaySlide(1),
      ).toBeVisible()
      await expectSlidePosition(2)
    })

    await test.step('Swipe right to previous image in overlay', async () => {
      await productDetailPage.imageGalleryOverlayScrollableSlider.evaluate(
        (el) => {
          el.scrollTo({ left: 0, top: 0, behavior: 'auto' })
        },
      )
      await expect(
        productDetailPage.getImageGalleryOverlayImage(0),
      ).toBeVisible()
      await expectSlidePosition(1)
    })
  } else {
    await test.step('Verify right arrow navigates to next image in overlay', async () => {
      await expect(
        productDetailPage.imageGalleryOverlayArrowRight,
      ).toBeVisible()
      await productDetailPage.imageGalleryOverlayArrowRight.click()
      await expect(
        productDetailPage.getImageGalleryOverlaySlide(1),
      ).toBeVisible()
      await expectSlidePosition(2)
    })

    await test.step('Verify left arrow navigates to previous image in overlay', async () => {
      await expect(productDetailPage.imageGalleryOverlayArrowLeft).toBeVisible()
      await productDetailPage.imageGalleryOverlayArrowLeft.click()
      await expect(
        productDetailPage.getImageGalleryOverlayImage(0),
      ).toBeVisible()
      await expectSlidePosition(1)
    })
  }

  await test.step('Click close button and verify overlay closes and PDP is shown', async () => {
    await expect(productDetailPage.imageGalleryOverlayCloseButton).toBeVisible()
    await productDetailPage.imageGalleryOverlayCloseButton.click()
    await expect(productDetailPage.getImageGalleryOverlayImage(0)).toBeHidden()
    const primaryMedia = isMobile(page)
      ? productDetailPage.mainImageSlide
      : productDetailPage.productImageGrid
    await primaryMedia.waitFor()
    await expect(primaryMedia).toBeVisible()
    await expect(productDetailPage.productName).toBeVisible()
  })
})

/**
 * Verifies PDP breadcrumb visibility and navigation: breadcrumb shows category levels,
 * clicking the lowest level opens the PLP with expanded navigation and active sub-category,
 * and clicking the middle level opens the parent category PLP.
 *
 * Test Criteria:
 * - Product must be active and in stock
 * - Product must belong to a subcategory with at least 3 levels (e.g. Women/Clothing/Pants)
 *
 * Desktop only; skipped on mobile.
 */
test('C2139794 Verify PDP breadcrumb', async ({
  productDetailPage,
  productListingPage,
  breadcrumb,
  page,
  countryDetector,
  storefrontAPIClient,
}) => {
  test.skip(isMobile(page), 'Test only for desktop browsers')

  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      product.isActive &&
      (product.variants?.some((variant) => variant.stock?.quantity > 0) ??
        false) &&
      (product.categories?.some((path) => path.length >= 3) ?? false),
  )

  test.skip(
    !productData,
    'No active product in stock with subcategory (3+ levels) found - skipping test',
  )

  const productId = productData!.id
  const longestPath = productData!.categories!.reduce(
    (longest, current) => (current.length > longest.length ? current : longest),
    [] as ProductCategory[],
  )

  console.log(
    `[PDP Test] Running breadcrumb test with product ID: ${productId}, category levels: ${longestPath
      .map((c) => c.categoryName)
      .join(' > ')}`,
  )

  await setupProductDetailTest(
    productData,
    'No active product in stock with subcategory (3+ levels) found - skipping test',
    { page, productDetailPage, countryDetector },
  )
  await productDetailPage.h1.waitFor()

  await test.step('PDP loads and breadcrumb shows category levels', async () => {
    await productDetailPage.breadcrumbCategoryLinks.first().waitFor()
    const count = await productDetailPage.breadcrumbCategoryLinks.count()
    expect(count).toBeGreaterThanOrEqual(3)

    for (let i = 0; i < longestPath.length; i++) {
      await expect(productDetailPage.getBreadcrumbCategoryLink(i)).toBeVisible()
      await expect(
        productDetailPage.getBreadcrumbCategoryLink(i),
      ).toContainText(longestPath[i].categoryName)
    }
  })

  await test.step('Click lowest level category in breadcrumb opens PLP with expanded nav and active sub-category', async () => {
    const lowestLevelLink = productDetailPage.breadcrumbCategoryLinks.last()
    await lowestLevelLink.scrollIntoViewIfNeeded()
    await lowestLevelLink.click()
    await page.waitForURL(/\/c\//, { timeout: 10000 })

    expect(page.url()).toContain('/c/')
    await breadcrumb.breadcrumbCategoryActive.waitFor()
    await expect(breadcrumb.breadcrumbCategoryActive).toBeVisible()
    await expect(productListingPage.sideNavigation).toBeVisible()
  })

  await test.step('Open PDP again and verify breadcrumb', async () => {
    // The product only has a tile when it is on the first page of the category.
    // Otherwise open it directly, because the category can hold more products than one page.
    await productListingPage.productItem.first().waitFor()
    const productTile = page.locator(`#product-${productId}`)
    if ((await productTile.count()) > 0) {
      await productTile.click()
      await page.waitForLoadState('networkidle')
    } else {
      await productDetailPage.navigate(
        page,
        `p/p-${productId}`,
        'domcontentloaded',
      )
    }
    await productDetailPage.h1.waitFor()

    await productDetailPage.breadcrumbCategoryLinks.first().waitFor()
    const count = await productDetailPage.breadcrumbCategoryLinks.count()
    expect(count).toBeGreaterThanOrEqual(3)
    for (let i = 0; i < longestPath.length; i++) {
      await expect(
        productDetailPage.getBreadcrumbCategoryLink(i),
      ).toContainText(longestPath[i].categoryName)
    }
  })

  await test.step('Click middle category level in breadcrumb opens PLP with expanded nav and active sub-category', async () => {
    const middleIndex = Math.floor(
      ((await productDetailPage.breadcrumbCategoryLinks.count()) - 1) / 2,
    )
    const middleLevelLink =
      productDetailPage.getBreadcrumbCategoryLink(middleIndex)
    await middleLevelLink.scrollIntoViewIfNeeded()
    await page.keyboard.press('Escape')
    await middleLevelLink.click()
    await page.waitForURL(/\/c\//, { timeout: 10000 })

    expect(page.url()).toContain('/c/')
    await breadcrumb.breadcrumbCategoryActive.waitFor()
    await expect(breadcrumb.breadcrumbCategoryActive).toBeVisible()
    await expect(productListingPage.sideNavigation).toBeVisible()
  })
})

/**
 * Verifies the PDP recently viewed products slider: hidden on first visit,
 * visible on second PDP with first product's card, and on return to first PDP
 * the second product's card is visible in the slider.
 *
 * Test Criteria:
 * - Product must be sellable now (same gate as C2141598 wishlist PDP test)
 * - At least one variant must be buyable now (in stock or sellable without stock)
 */
test('C2240762 Verify PDP recently viewed products slider', async ({
  productDetailPage,
  countryDetector,
  page,
  storefrontAPIClient,
}) => {
  const product1 = await storefrontAPIClient.findProduct(
    (product) =>
      isProductSellableNow(product) &&
      (product.variants?.some(isVariantBuyableNow) ?? false),
  )
  test.skip(
    !product1,
    'No sellable product with a buyable variant found - skipping test',
  )

  const product2 = await storefrontAPIClient.findProduct(
    (p) =>
      isProductSellableNow(p) &&
      (p.variants?.some(isVariantBuyableNow) ?? false) &&
      p.id !== product1!.id,
  )
  test.skip(
    !product2,
    'No second sellable product with a buyable variant found - skipping test',
  )

  await setupProductDetailTest(
    product1,
    'No sellable product with a buyable variant found - skipping test',
    { page, productDetailPage, countryDetector },
  )
  await productDetailPage.h1.waitFor()

  await test.step('1. First PDP: recently viewed slider is not visible', async () => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(productDetailPage.recentlyViewedProductsSlider).toBeHidden()
  })

  await test.step('2. Open second PDP: recently viewed visible and contains first product', async () => {
    await productDetailPage.navigate(page, `p/p-${product2!.id}`, 'networkidle')
    await productDetailPage.h1.waitFor()
    await productDetailPage.recentlyViewedProductsSlider.scrollIntoViewIfNeeded()
    await expect(productDetailPage.recentlyViewedProductsSlider).toBeVisible()
    await expect(
      productDetailPage.getRecentlyViewedProductCard(product1!.id),
    ).toBeVisible()
  })

  await test.step('3. Go back to first PDP: recently viewed contains second product', async () => {
    await productDetailPage.navigate(page, `p/p-${product1!.id}`, 'networkidle')
    await productDetailPage.h1.waitFor()
    await productDetailPage.recentlyViewedProductsSlider.scrollIntoViewIfNeeded()
    await expect(productDetailPage.recentlyViewedProductsSlider).toBeVisible()
    await expect(
      productDetailPage.getRecentlyViewedProductCard(product2!.id),
    ).toBeVisible()
  })
})

/**
 * C2349764: Verifies that the Similar Products slider is visible on the PDP.
 * The Similar Products slider is distinct from other PDP sliders (e.g. recently
 * viewed, main category recommendations) and is identified by data-testid.
 *
 * Test Criteria:
 * - Product must be sellable now (same gate as C2141598 wishlist PDP test)
 * - At least one variant must be buyable now (in stock or sellable without stock)
 * - Similar products must be returned by the API for the slider to be rendered
 */
test('C2349764 Verify PDP Similar Products slider', async ({
  productDetailPage,
  countryDetector,
  page,
  storefrontAPIClient,
}) => {
  const product = await storefrontAPIClient.findProduct(
    (p) =>
      isProductSellableNow(p) &&
      (p.variants?.some(isVariantBuyableNow) ?? false),
  )

  await setupProductDetailTest(
    product,
    'No sellable product with a buyable variant found - skipping test',
    { page, productDetailPage, countryDetector },
  )
  await productDetailPage.h1.waitFor()

  await productDetailPage.similarProductsSlider.scrollIntoViewIfNeeded()
  await expect(productDetailPage.similarProductsSlider).toBeVisible()
})

/**
 * Verifies that the PDP optional URL variant ID parameter is present for multi-size products
 * when a variant is selected via the size selector, and that going back then loads the
 * homepage (not the initial PDP without variantId).
 *
 * Test Criteria:
 * - Product must be sellable now
 * - Product must have multiple variants
 * - At least one variant must be buyable now (in stock or sellable without stock)
 *
 * The test navigates to homepage then to PDP, asserts no variantId, selects a variant,
 * then goes back and asserts the homepage is loaded.
 */
test('C2173504 Verify PDP optional URL Variant ID parameter multi size', async ({
  productDetailPage,
  countryDetector,
  page,
  baseURL,
  storefrontAPIClient,
}) => {
  const product = await storefrontAPIClient.findProduct(
    (product) =>
      isProductSellableNow(product) &&
      (product.variants?.length ?? 0) > 1 &&
      (product.variants?.some(isVariantBuyableNow) ?? false),
  )

  test.skip(
    !product,
    'No sellable multi-variant product with a buyable variant found - skipping test',
  )

  await productDetailPage.navigate(page, ROUTES.home, 'networkidle')
  await countryDetector.closeModal()

  await setupProductDetailTest(
    product,
    'No sellable multi-variant product with a buyable variant found - skipping test',
    { page, productDetailPage, countryDetector },
  )
  await productDetailPage.variantPicker.waitFor()

  expect(page.url()).not.toContain('variantId')

  await productDetailPage.variantPicker.click({ force: true })
  await productDetailPage.clickVariantOption()

  await expect(async () => {
    expect(page.url()).toContain('variantId')
  }).toPass({ timeout: 1000 })

  await test.step('Click back and assert homepage is loaded, not initial PDP', async () => {
    await page.goBack()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(getHomepageUrl(baseURL))
    expect(page.url()).not.toMatch(/\/p\/p-\d+/)
  })
})

/**
 * Verifies that the subscription service is correctly displayed and functional on the PDP,
 * and that subscription product information is shown on the basket product card after add.
 * The test finds a product with at least one subscription-eligible variant that has available stock,
 * then verifies the subscription service behavior.
 *
 * Test Criteria:
 * - Product must be active
 * - Product must have at least one variant with subscriptionEligibility where
 *   both values.label and values.value are "true"
 * - Variant must have available stock (quantity > 0)
 */
test('C2141599: Verify PDP Subscription service', async ({
  productDetailPage,
  page,
  header,
  basketPage,
  addToBasketSlideIn,
  countryDetector,
  storefrontAPIClient,
}) => {
  // Helper function to check if a variant is eligible (in stock and subscription eligible)
  const isVariantEligible = (variant: Variant): boolean => {
    if (variant.stock.quantity === 0) {
      return false
    }

    const values = variant.attributes?.subscriptionEligibility?.values
    const value = Array.isArray(values) ? values[0] : values

    return !!value && value.label === 'true' && value.value === 'true'
  }

  // Find a product with at least one subscription-eligible variant that has available stock
  const product = await storefrontAPIClient.findProduct(
    (product) =>
      product.isActive && !!product.variants?.some(isVariantEligible),
  )

  test.skip(
    !product,
    'No product with subscription-eligible variant found - skipping test',
  )

  // Find an eligible variant (in stock and subscription eligible)
  const eligibleVariant = product!.variants!.find(isVariantEligible)
  const productId = product!.id

  const intervalValues =
    eligibleVariant?.attributes?.subscriptionAvailableIntervals?.values
  const firstInterval = Array.isArray(intervalValues)
    ? intervalValues[0]
    : intervalValues
  const expectedIntervalLabel = firstInterval?.label
    ? String(firstInterval.label)
    : undefined

  console.log(
    `[PDP Test] Running subscription test with product ID: ${productId}`,
  )
  console.log(`[PDP Test] Eligible variant ID: ${eligibleVariant?.id}`)

  await setupProductDetailTest(
    product,
    'No product with subscription-eligible variant found - skipping test',
    {
      page,
      productDetailPage,
      countryDetector,
      path: `p/p-${productId}`,
    },
  )

  await test.step('Check subscription before choosing the size', async () => {
    await expect(productDetailPage.subscriptionService).toBeVisible()
    await expect(productDetailPage.addToBasketButtonSubscribe).toBeHidden()
  })

  await test.step('Check subscription after choosing an eligible variant', async () => {
    await productDetailPage.variantPicker.waitFor()
    await productDetailPage.variantPicker.click({ force: true })
    await productDetailPage.getVariant(eligibleVariant!.id.toString()).click()

    await expect(productDetailPage.addToBasketButtonSubscribe).toBeVisible()

    await productDetailPage.addToBasketButtonSubscribe.click()
    await header.basketNumItems.waitFor()

    await expect(header.basketNumItems).toHaveText('1')

    // The confirmation slide-in makes the header inert, so the next step
    // cannot reach the basket link until it is dismissed.
    await addToBasketSlideIn.dismiss()
  })

  await test.step('Check subscription product information on basket page', async () => {
    test.skip(
      !expectedIntervalLabel,
      'Eligible variant has no subscription interval label - skipping basket assertion',
    )

    await header.visitBasketPage()
    await basketPage.basketProductCard.first().waitFor()

    await basketPage.assertSubscriptionProductInfo(expectedIntervalLabel!)
  })
})

/**
 * Verifies that the low stock banner is displayed on the PDP and basket for a
 * variant with limited stock.
 *
 * Test Criteria:
 * - Product must be sellable now
 * - Product must have at least one buyable variant with 1 or 2 items in stock
 *
 * The test finds a product meeting these criteria, opens the PDP for the low
 * stock variant, verifies the banner, adds the item to the basket, and checks
 * the banner on the basket page.
 */
test('C2638771: Verify low stock product', async ({
  page,
  productDetailPage,
  header,
  basketPage,
  countryDetector,
  storefrontAPIClient,
}) => {
  const isVariantLowStockQuantity = (variant: Variant): boolean => {
    const quantity = variant.stock.quantity
    return quantity === 1 || quantity === 2
  }

  const product = await storefrontAPIClient.findProduct(
    (product) =>
      isProductSellableNow(product) &&
      (product.variants?.some(
        (variant) =>
          isVariantBuyableNow(variant) && isVariantLowStockQuantity(variant),
      ) ??
        false),
  )

  test.skip(
    !product,
    'No sellable product with a low stock variant (1 or 2 items) found - skipping test',
  )

  const lowStockVariant = product!.variants!.find(
    (variant) =>
      isVariantBuyableNow(variant) && isVariantLowStockQuantity(variant),
  )

  test.skip(
    !lowStockVariant,
    'No low stock variant found on selected product - skipping test',
  )

  const productId = product!.id
  const variantId = lowStockVariant!.id

  console.log(
    `[PDP Test] Running low stock test with product ID: ${productId}, variant ID: ${variantId}`,
  )

  await setupProductDetailTest(
    product,
    'No sellable product with a low stock variant (1 or 2 items) found - skipping test',
    {
      page,
      productDetailPage,
      countryDetector,
      path: `p/p-${productId}?variantId=${variantId}`,
    },
  )

  await test.step('Check low stock banner on PDP', async () => {
    await expect(productDetailPage.lowStockBanner).toBeVisible()
  })

  await test.step('Add low stock product to basket', async () => {
    await productDetailPage.addProductToBasket()
    await header.basketNumItems.waitFor()
    await expect(header.basketNumItems).toHaveText('1')
  })

  await test.step('Check low stock banner on basket page', async () => {
    await header.visitBasketPage()
    await basketPage.basketProductCard.first().waitFor()
    await expect(basketPage.basketLowStockBanner).toBeVisible()
  })
})

/**
 * Verifies the PDP price information modal for discounted products.
 *
 * Test Criteria:
 * - Product must be sellable now
 * - At least one variant must be buyable now and have a sale or campaign reduction
 *
 * The test opens the PDP, verifies the price info trigger is visible, opens the
 * modal, and closes it again.
 */
test('C2638900: Verify PDP price details modal', async ({
  productDetailPage,
  countryDetector,
  page,
  storefrontAPIClient,
}) => {
  const hasPriceDiscount = (variant: Variant) =>
    variant.price.appliedReductions.some(
      (reduction) =>
        reduction.category === 'sale' || reduction.category === 'campaign',
    )

  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      isProductSellableNow(product) &&
      (product.variants?.some(
        (variant) => hasPriceDiscount(variant) && isVariantBuyableNow(variant),
      ) ??
        false),
  )

  const product = await setupProductDetailTest(
    productData,
    'No sellable product with a discounted variant found - skipping test',
    { page, productDetailPage, countryDetector },
  )

  console.log(
    `[PDP Test] Running price details modal test with product ID: ${product.id}`,
  )
  await productDetailPage.h1.waitFor()

  await test.step('Verify price info trigger is visible', async () => {
    await expect(productDetailPage.priceDetailsButton).toBeVisible()
  })

  await test.step('Open price information modal', async () => {
    await productDetailPage.clickPriceDetailsButton()
    await expect(productDetailPage.priceInfoModal).toBeVisible()
  })

  await test.step('Close price information modal', async () => {
    await productDetailPage.clickPriceInfoModalCloseButton()
    await expect(productDetailPage.priceInfoModal).toBeHidden()
  })
})
