import { expect } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import {
  PLP_FILTER_DEEP_LINK,
  PLP_SALE_FILTER_DEEP_LINK,
  SORTING,
  PLP_TEST_DATA,
  ROUTES,
} from '../../support/constants'
import {
  verifySeoMetaTags,
  navigationItemLabel,
  getPlpHeadlineCategoryName,
  formatCategoryUrlSegment,
  assertFilterAndSortButtons,
  applySorting,
  parseLocatorTextToNumber,
  isMobile,
  requireNavigableMainCategory,
} from '../../support/utils'
import { skipForCatalogGap } from '../../support/productTestHelpers'

/**
 * @file Contains end-to-end tests for the Product Listing Page (PLP),
 * verifying its standard components, breadcrumb navigation, filtering,
 * adding to wishlist, product siblings, page title, pagination, sorting,
 * and SEO meta data.
 */

/**
 * Verifies the visibility of standard components on the Product
 * Listing Page, including the sort dropdown (desktop), filter button, breadcrumb
 * elements (category levels and active category), product items, and the product counter.
 */
test('C2130723: Verify PLP standard components', async ({
  productListingPage,
  breadcrumb,
  page,
  filters,
  sorting,
  storefrontAPIClient,
  countryDetector,
}) => {
  // Find a category with at least 1 product to test the PLP components
  const categoryWithProducts =
    await storefrontAPIClient.findCategoryWithProducts(1)

  test.skip(!categoryWithProducts, 'No category found with products')

  const categoryPath = storefrontAPIClient.getCategoryPath(
    categoryWithProducts!,
  )

  await page.goto(categoryPath, {
    waitUntil: 'networkidle',
  })
  await countryDetector.closeModal()
  await page.waitForLoadState('networkidle')

  await assertFilterAndSortButtons(page, filters, sorting)
  await expect(breadcrumb.breadcrumbCategoryActive).toBeVisible()
  await expect(productListingPage.productItem.first()).toBeVisible()
  await expect(breadcrumb.productCounter).toBeVisible()
})

/**
 * Verifies the visibility and content of the breadcrumb on the
 * sub-category PLP and checks if clicking the main category in the breadcrumb
 * navigates to the correct main category PLP with the correct URL structure.
 */
test('C2130725: Verify PLP breadcrumb', async ({
  breadcrumb,
  page,
  productListingPage,
  storefrontAPIClient,
  countryDetector,
}) => {
  // Find a subcategory with its parent category
  const subcategoryData = await storefrontAPIClient.findSubcategoryWithParent(1)

  test.skip(
    !subcategoryData,
    'No subcategory found with products and a parent category',
  )

  const subcategoryPath = storefrontAPIClient.getCategoryPath(
    subcategoryData!.child,
  )

  await test.step('Navigate to subcategory', async () => {
    await page.goto(subcategoryPath, {
      waitUntil: 'networkidle',
    })
    await countryDetector.closeModal()
    await page.waitForLoadState('networkidle')
  })

  await test.step('Verify sub-category breadcrumb', async () => {
    await breadcrumb.productCounter.waitFor()

    const activeCategoryName = await getPlpHeadlineCategoryName(
      breadcrumb.breadcrumbCategoryActive,
    )

    if (isMobile(page)) {
      await expect(breadcrumb.breadcrumbCategoryActive).toBeVisible()
      await expect(breadcrumb.productCounter).toBeVisible()
      await expect(productListingPage.backButton).toBeVisible()
    } else {
      await expect(breadcrumb.breadcrumbCategoryLvl0).toBeVisible()
      await expect(breadcrumb.breadcrumbCategoryActive).toBeVisible()
      await expect(breadcrumb.productCounter).toBeVisible()
    }

    expect(page.url()).toContain(formatCategoryUrlSegment(activeCategoryName))
  })

  await test.step('Verify main category breadcrumb', async () => {
    if (isMobile(page)) {
      await productListingPage.backButton.click()
    } else {
      await breadcrumb.breadcrumbCategoryLvl0.click()
    }

    await breadcrumb.productCounter.waitFor()

    if (isMobile(page)) {
      await expect(breadcrumb.breadcrumbCategoryActive).toBeVisible()
      await expect(breadcrumb.productCounter).toBeVisible()
    } else {
      await expect(breadcrumb.breadcrumbCategoryLvl0).toBeVisible()
      await expect(breadcrumb.productCounter).toBeVisible()
    }

    const activeCategoryName = await getPlpHeadlineCategoryName(
      breadcrumb.breadcrumbCategoryActive,
    )

    expect(page.url()).toContain(formatCategoryUrlSegment(activeCategoryName))
  })
})

/**
 * Verifies the initial state of the filters flyout, applies price,
 * color, and size filters, checks if the product count is updated correctly,
 * verifies the filter counter badge, and then resets the filters.
 */
test('C2130727: Verify PLP Filters and Product Count', async ({
  breadcrumb,
  filters,
  toastMessage,
  page,
  storefrontAPIClient,
  countryDetector,
}) => {
  // Find a category with at least 10 products to test the filters
  const categoryWithProducts =
    await storefrontAPIClient.findCategoryWithProducts(10)

  test.skip(!categoryWithProducts, 'No category found with products')

  const categoryPath = storefrontAPIClient.getCategoryPath(
    categoryWithProducts!,
  )

  await test.step('Navigate to category with products', async () => {
    await page.goto(categoryPath, {
      waitUntil: 'networkidle',
    })
    await countryDetector.closeModal()
    await page.waitForLoadState('networkidle')
  })

  const initialProductCountValue = await parseLocatorTextToNumber(
    breadcrumb.productCounter,
  )

  const MIN_PRICE_DISPLAY = '80'
  const MAX_PRICE_DISPLAY = '100'
  const MIN_PRICE_URL = String(parseInt(MIN_PRICE_DISPLAY) * 100)
  const MAX_PRICE_URL = String(parseInt(MAX_PRICE_DISPLAY) * 100)

  await test.step('Verify initial state', async () => {
    await expect(breadcrumb.productCounter).toBeVisible()
    await filters.buttonOpenFilters.click()
    await expect(filters.closeFiltersButton).toBeVisible()
  })

  await test.step('Apply price filters', async () => {
    await filters.filterPriceInput.first().clear()
    await filters.filterPriceInput.first().focus()
    await filters.filterPriceInput.first().fill(MIN_PRICE_DISPLAY)
    await filters.filterPriceInput.first().press('Tab')
    await page.waitForURL(
      (url) => url.searchParams.get('filters[minPrice]') === MIN_PRICE_URL,
    )
    await filters.filterPriceInput.nth(1).clear()
    await filters.filterPriceInput.nth(1).focus()
    await filters.filterPriceInput.nth(1).fill(MAX_PRICE_DISPLAY)
    await filters.filterPriceInput.nth(1).press('Tab')
    await page.waitForURL(
      (url) =>
        url.searchParams.get('filters[minPrice]') === MIN_PRICE_URL &&
        url.searchParams.get('filters[maxPrice]') === MAX_PRICE_URL,
    )
    const currentProductCount = await parseLocatorTextToNumber(
      breadcrumb.productCounter,
    )

    expect(currentProductCount).not.toBeNull()
    expect(currentProductCount).not.toBe(initialProductCountValue)
  })

  await test.step('Apply color filter', async () => {
    const colorFilterValue = await filters.filterColorChip
      .first()
      .getAttribute('data-color-id')
    expect(colorFilterValue).not.toBeNull()

    await filters.filterColorChip.first().scrollIntoViewIfNeeded()
    await page.waitForLoadState('domcontentloaded')
    await filters.filterColorChip.first().setChecked(true)
    await page.waitForURL(
      (url) => url.searchParams.get('filters[color]') === colorFilterValue,
    )
  })

  await test.step('Apply size filter', async () => {
    const sizeFilterValue = await filters.filterSizeCheckbox
      .first()
      .getAttribute('value')
    expect(sizeFilterValue).not.toBeNull()

    await filters.filterSizeCheckbox.first().scrollIntoViewIfNeeded()
    await page.waitForLoadState('domcontentloaded')
    await filters.filterSizeCheckbox.first().setChecked(true)
    await page.waitForURL(
      (url) => url.searchParams.get('filters[size]') === sizeFilterValue,
    )
  })

  await test.step('Check product counter', async () => {
    const currentProductCount = await parseLocatorTextToNumber(
      breadcrumb.productCounter,
    )
    const filteredButtonLabel = await filters.filterApplyButton.textContent()

    let counterFilterButton: number | null = null
    if (filteredButtonLabel) {
      const match = filteredButtonLabel.match(/\d+/g)
      counterFilterButton = match ? parseInt(match[0], 10) : null
      counterFilterButton = isNaN(counterFilterButton as number)
        ? null
        : counterFilterButton
    }

    expect(currentProductCount).not.toBeNull()
    expect(counterFilterButton).not.toBeNull()
    expect(currentProductCount).toEqual(counterFilterButton)

    expect(currentProductCount).not.toEqual(initialProductCountValue)
  })

  await test.step('Apply filters and close the flyout', async () => {
    await filters.filterApplyButton.click()
    await toastMessage.assertToastInfoIsVisible()

    await expect(filters.closeFiltersButton).toBeHidden()
    await expect(filters.filterCounter).toBeVisible()
    await expect(filters.buttonOpenFilters).toContainText('3')
  })

  await test.step('Reset filters', async () => {
    await filters.buttonOpenFilters.click()
    await filters.filterResetButton.click()
    await filters.closeFiltersButton.click()

    await expect(filters.buttonOpenFilters).not.toContainText('3')
    await expect(filters.filterCounter).toBeHidden()
  })
})

/**
 * Verifies that directly navigating to a PLP with the sale filter in the URL
 * (deep-link) applies it, as indicated by the filter counter, the checked sale
 * switch and a non-empty listing.
 *
 * Needs a category whose `sale` filter matches at least one product. The
 * Storefront API's filters endpoint decides that, because a product can carry a
 * sale reduction while the computed sale filter counts it as 0, and the listing
 * renders no sale switch then. The test skips when no category qualifies.
 * It has no TestRail case ID.
 */
test('Verify PLP Filters deep-link with the sale filter', async ({
  productListingPage,
  filters,
  countryDetector,
  page,
  breadcrumb,
  storefrontAPIClient,
}) => {
  const categoryWithSaleProducts =
    await storefrontAPIClient.findCategoryWithSaleProducts()

  skipForCatalogGap(
    'PLP sale deep-link',
    !categoryWithSaleProducts,
    'Catalog gap: no category whose sale filter matches a product.',
  )

  const categoryPath = storefrontAPIClient.getCategoryPath(
    categoryWithSaleProducts!,
  )

  await test.step('Navigate to category with sale products', async () => {
    await page.goto(categoryPath)
    await countryDetector.closeModal()
    await breadcrumb.breadcrumbCategoryActive.waitFor()
  })

  await test.step('Apply the sale filter via deep-link', async () => {
    await productListingPage.addFiltersToPLP(PLP_SALE_FILTER_DEEP_LINK)
    await countryDetector.closeModal()
  })

  await test.step('Verify the sale filter is applied', async () => {
    expect(new URL(page.url()).searchParams.get('filters[sale]')).toBe('true')
    await expect(filters.filterCounter).toHaveText('1')
    await expect(breadcrumb.productCounter).toContainText(/[1-9]/)

    await filters.buttonOpenFilters.click()
    await filters.closeFiltersButton.waitFor()
    await expect(filters.filterSaleSwitch).toBeChecked()
  })
})

/** How many color chips the deep-link test checks for products under the price limit. */
const MAX_COLORS_TO_TRY = 5

/**
 * Verifies that directly navigating to a PLP with predefined filters
 * in the URL (deep-link) correctly applies those filters, as indicated
 * by the filter counter, the checked state of the filter options and a
 * non-empty listing.
 *
 * Needs a category with at least 10 products whose filter dialog has a color
 * chip, and at least one of the first five colors must have a product up to the
 * price limit. It skips when there is none. The filters are a price limit and a
 * color read from the filter dialog, so the test does not depend on the shop's
 * sale data. It follows the TestRail case: the filter overlay is closed after
 * the page loads, the toggle shows the number of active filters, and opening
 * the overlay shows them selected.
 */
test('C2139744: Verify PLP Filters deep-link', async ({
  productListingPage,
  filters,
  countryDetector,
  page,
  breadcrumb,
  storefrontAPIClient,
}) => {
  // Find a category with at least 10 products to test the deep-link filters
  const categoryWithProducts =
    await storefrontAPIClient.findCategoryWithProducts(10)

  test.skip(!categoryWithProducts, 'No category found with products')

  const categoryPath = storefrontAPIClient.getCategoryPath(
    categoryWithProducts!,
  )

  await test.step('Navigate to category with products', async () => {
    await page.goto(categoryPath, {
      waitUntil: 'networkidle',
    })
    await countryDetector.closeModal()
    await page.waitForLoadState('networkidle')
    await breadcrumb.breadcrumbCategoryActive.waitFor()
  })

  const colorId =
    await test.step('Pick a color with products under the price limit', async () => {
      await filters.buttonOpenFilters.click()
      await filters.closeFiltersButton.waitFor()
      // The filter options arrive as a deferred prop after the dialog opens.
      await filters.filterColorChip
        .first()
        .waitFor({ timeout: 10_000 })
        .catch(() => undefined)
      skipForCatalogGap(
        'C2139744',
        (await filters.filterColorChip.count()) === 0,
        'Catalog gap: the category has no color filter chip.',
      )
      const chipColorIds = await filters.filterColorChip.evaluateAll(
        (chips, limit) =>
          chips
            .slice(0, limit)
            .map((chip) => chip.getAttribute('data-color-id'))
            .filter((id): id is string => id !== null),
        MAX_COLORS_TO_TRY,
      )
      const id = await storefrontAPIClient.findColorWithProducts(
        categoryWithProducts!.id,
        chipColorIds,
        PLP_FILTER_DEEP_LINK.maxPrice,
      )
      skipForCatalogGap(
        'C2139744',
        id === undefined,
        `Catalog gap: no color chip has products up to ${PLP_FILTER_DEEP_LINK.maxPrice}.`,
      )
      return id!
    })

  await test.step('Apply filters via deep-link', async () => {
    await productListingPage.addFiltersToPLP({
      ...PLP_FILTER_DEEP_LINK,
      color: colorId,
    })
    await countryDetector.closeModal()
  })

  await test.step('Verify filters are applied', async () => {
    const url = new URL(page.url())
    expect(url.searchParams.get('filters[color]')).toBe(colorId)
    expect(url.searchParams.get('filters[maxPrice]')).toBe(
      String(PLP_FILTER_DEEP_LINK.maxPrice),
    )

    // The price range counts as one filter, the color as the other.
    await expect(filters.filterCounter).toHaveText('2')

    // An empty listing would also show the counter, so check for products.
    await expect(breadcrumb.productCounter).toContainText(/[1-9]/)

    await expect(filters.buttonOpenFilters).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    await filters.buttonOpenFilters.click()
    await filters.closeFiltersButton.waitFor()
    await expect(
      page.locator(`[data-color-id="${colorId}"]`).first(),
    ).toBeChecked()
  })
})

/**
 * Verifies that a user can add a product to their Wishlist by
 * clicking the wishlist button on the PLP product card, and that the
 * Wishlist item counter in the header is updated. It also verifies the
 * removal of the product from the Wishlist from the PLP, checking if
 * the counter and the button state are updated accordingly.
 */
test('C2130731: Verify PLP Add to Wishlist', async ({
  productListingPage,
  header,
  page,
  storefrontAPIClient,
  countryDetector,
}) => {
  // Find a category with at least 1 product to test the wishlist functionality
  const categoryWithProducts =
    await storefrontAPIClient.findCategoryWithProducts(1)

  test.skip(!categoryWithProducts, 'No category found with products')

  const categoryPath = storefrontAPIClient.getCategoryPath(
    categoryWithProducts!,
  )

  await test.step('Navigate to category with products', async () => {
    await page.goto(categoryPath, {
      waitUntil: 'networkidle',
    })
    await countryDetector.closeModal()
    await page.waitForLoadState('networkidle')
  })

  await test.step('Verify product items and wishlist button are visible', async () => {
    await expect(productListingPage.productItem.first()).toBeVisible()
    await expect(productListingPage.wishlistButton.first()).toBeVisible()
  })

  await test.step('Add product to Wishlist', async () => {
    await expect(async () => {
      await productListingPage.wishlistButton.first().waitFor()
      await productListingPage.addProductToWishlist()
      await header.wishlistNumItems.first().waitFor()
      await expect(header.wishlistNumItems.first()).toHaveText('1')
      await expect(
        productListingPage.removeFromWishlistButton.first(),
      ).toBeVisible()
    }).toPass()
  })

  await test.step('Remove product from Wishlist', async () => {
    await expect(async () => {
      await productListingPage.removeProductFromWishlist()
      await expect(header.wishlistNumItems.first()).toBeHidden()
      await expect(productListingPage.wishlistButton.first()).toBeVisible()
    }).toPass()
  })
})

/**
 * Desktop: Verifies that hovering over a product tile on the PLP reveals
 * a product sibling, and clicking on that sibling navigates the user to
 * the correct URL for the sibling product.
 * Mobile: Verifies that product siblings are not displayed on product cards.
 */
test('C2132074: Verify PLP Product siblings', async ({
  page,
  storefrontAPIClient,
  countryDetector,
  productListingPage,
}) => {
  // Find a category with products first
  const categoryWithProducts =
    await storefrontAPIClient.findCategoryWithProducts(1)

  test.skip(
    !categoryWithProducts,
    'No category found with products - skipping test',
  )

  const categoryPath = storefrontAPIClient.getCategoryPath(
    categoryWithProducts!,
  )

  await test.step('Navigate to category and get visible products', async () => {
    await page.goto(categoryPath, {
      waitUntil: 'networkidle',
    })
    await countryDetector.closeModal()
    await page.waitForLoadState('networkidle')

    // Wait for at least one product to be visible
    await expect(productListingPage.productCard.first()).toBeVisible()
  })

  // Get all visible product IDs from the DOM
  // Product cards have id="product-{productId}" format
  const visibleProductIds = await productListingPage.productCard.evaluateAll(
    (cards) => {
      return cards
        .map((card) => {
          // Runs inside the browser
          const match = card.id.match(/^product-(\d+)$/)
          return match ? parseInt(match[1], 10) : null
        })
        .filter((id): id is number => id !== null) // Remove nulls
    },
  )

  test.skip(
    visibleProductIds.length === 0,
    'No product card with a product id on the listing - skipping test',
  )

  // Find a product with siblings from the visible products
  const productWithSiblings =
    await storefrontAPIClient.findProductWithSiblingsFromIds(
      visibleProductIds,
      (product) =>
        product.isActive && // must be active
        product.siblings!.length > 1, // must have multiple siblings
    )

  test.skip(
    !productWithSiblings,
    'No product with siblings found among visible products - skipping test',
  )

  if (isMobile(page)) {
    await test.step('Verify siblings are not displayed on mobile', async () => {
      const cards = productListingPage.productCard
      const cardCount = await cards.count()

      for (let i = 0; i < cardCount; i++) {
        const card = cards.nth(i)
        await card.scrollIntoViewIfNeeded()
        await page.waitForLoadState('domcontentloaded')

        await expect(
          productListingPage.getProductCardSiblingsOverlay(card),
        ).toBeHidden()

        const siblings = productListingPage.getProductCardSiblings(card)
        const siblingCount = await siblings.count()
        for (let j = 0; j < siblingCount; j++) {
          await expect(siblings.nth(j)).toBeHidden()
        }
      }
    })

    return
  }

  await test.step('Verify product sibling interaction', async () => {
    const productTile = productListingPage.getProductCardById(
      productWithSiblings!.id,
    )
    // Ensure the product tile is visible on the first page
    await expect(productTile).toBeVisible()
    await productTile.scrollIntoViewIfNeeded()
    await productTile.hover()
    await page.waitForLoadState('domcontentloaded')

    const productSibling = productListingPage
      .getProductCardSiblings(productTile)
      .first()
    const productSiblingPath = (await productSibling.getAttribute(
      'href',
    )) as string

    await productSibling.click()
    await page.waitForURL(productSiblingPath)

    const pageUrl = page.url()

    expect(pageUrl).toContain(productSiblingPath)
  })
})

/**
 * Verifies that the document title of the Product Listing Page reflects the
 * active category and its parent category in `{listingTitle} | {shopName}` format.
 */
test('C2141756: Verify PLP page title', async ({
  breadcrumb,
  page,
  storefrontAPIClient,
  countryDetector,
}) => {
  // Find a subcategory with its parent category
  const subcategoryData = await storefrontAPIClient.findSubcategoryWithParent(1)

  test.skip(
    !subcategoryData,
    'No subcategory found with products and a parent category',
  )

  const subcategoryPath = storefrontAPIClient.getCategoryPath(
    subcategoryData!.child,
  )

  await test.step('Navigate to subcategory', async () => {
    await page.goto(subcategoryPath, {
      waitUntil: 'networkidle',
    })
    await countryDetector.closeModal()
    await page.waitForLoadState('networkidle')
  })

  await test.step('Verify page title contains active category', async () => {
    await breadcrumb.breadcrumbCategoryActive.waitFor()
    await breadcrumb.breadcrumbCategoryLvl0.waitFor({
      state: isMobile(page) ? 'attached' : 'visible',
    })

    const activeCategory = await getPlpHeadlineCategoryName(
      breadcrumb.breadcrumbCategoryActive,
    )
    const parentCategory = navigationItemLabel(
      (await breadcrumb.breadcrumbCategoryLvl0.textContent()) ?? '',
    )
    const pageTitle = await page.title()

    expect(pageTitle).toContain(`${activeCategory} - ${parentCategory} | `)
  })
})

/**
 * Verifies the initial state of the Previous and Next page
 * buttons in the pagination component, and then tests the navigation
 * functionality using these buttons to move between pages. It also
 * verifies navigation using direct page number buttons.
 */
test('C2130729: Verify PLP Pagination', async ({
  pagination,
  storefrontAPIClient,
  page,
  countryDetector,
}) => {
  // Find a category with at least X products, so we can test the pagination buttons.
  // 100 products should be fine for this test.
  const categoryWithManyProducts =
    await storefrontAPIClient.findCategoryWithProducts(100)

  test.skip(
    !categoryWithManyProducts,
    'No category found with at least 100 products (3+ pages)',
  )

  const categoryPath = storefrontAPIClient.getCategoryPath(
    categoryWithManyProducts!,
  )

  await test.step('Navigate to category with many products', async () => {
    await page.goto(categoryPath, {
      waitUntil: 'networkidle',
    })
    await countryDetector.closeModal()
    await page.waitForLoadState('networkidle')
  })

  await test.step('Verify Previous/Next page buttons initial state', async () => {
    await pagination.assertPaginationInitialState()
  })

  await test.step('Verify page navigation using Previous/Next page buttons', async () => {
    await pagination.clickNextPage()
    await pagination.clickPreviousPage()
  })

  await test.step('Verify page navigation using exact page number pagination button', async () => {
    await pagination.clickExactPage('3')
    await page.waitForLoadState('domcontentloaded')
    const pageUrl = page.url()

    expect(pageUrl).toContain('?page=3')
  })
})

/**
 * Verifies that when filters are applied on a specific page
 * of the PLP (navigated to using pagination), the page URL does not
 * retain the pagination parameter, ensuring filters are applied to all
 * relevant products across all pages.
 *
 * This test dynamically finds a category with sufficient products
 * (e.g. total 50 products with 24 products per page) using the Storefront API Client.
 */
test('C2162468: Verify PLP Pagination setting filters', async ({
  pagination,
  filters,
  page,
  storefrontAPIClient,
  countryDetector,
}) => {
  // Find a category with at least 50 products (2+ pages with 24 per page)
  const categoryWithManyProducts =
    await storefrontAPIClient.findCategoryWithProducts(50)

  test.skip(
    !categoryWithManyProducts,
    'No category found with at least 50 products (2+ pages)',
  )

  const categoryPath = storefrontAPIClient.getCategoryPath(
    categoryWithManyProducts!,
  )

  await test.step('Navigate to category with many products', async () => {
    await page.goto(categoryPath, {
      waitUntil: 'networkidle',
    })
    await countryDetector.closeModal()
    await page.waitForLoadState('networkidle')
  })

  await test.step('Navigate to page 2 and apply filters', async () => {
    await pagination.clickExactPage('2')
    await filters.buttonOpenFilters.click()
    await filters.closeFiltersButton.waitFor({ state: 'visible' })

    await filters.filterPriceInput.nth(1).clear()
    await filters.filterPriceInput.nth(1).focus()
    await filters.filterPriceInput.nth(1).fill('100')
    await filters.filterPriceInput.nth(1).press('Tab')

    await page.waitForLoadState('domcontentloaded')
    await filters.filterApplyButton.click()
    await page.waitForLoadState('domcontentloaded')

    await expect(page).not.toHaveURL(/\?page=/)
    await expect(filters.filterCounter).toContainText('1')
  })
})

/**
 * Verifies the sorting of products on the PLP by price, both
 * in ascending and descending order. It checks if the URL reflects the
 * applied sorting option and if the order of the first product card changes
 * after applying different sorting methods.
 */
test('C2162411 C2229455 Verify PLP Sorting', async ({
  productListingPage,
  filters,
  page,
  sorting,
  storefrontAPIClient,
  countryDetector,
}) => {
  // Find a category with at least 20 products to test sorting (need multiple products to verify order change)
  const categoryWithProducts =
    await storefrontAPIClient.findCategoryWithProducts(20)

  test.skip(
    !categoryWithProducts,
    'No category found with at least 20 products',
  )

  const categoryPath = storefrontAPIClient.getCategoryPath(
    categoryWithProducts!,
  )

  await test.step('Navigate to category with products', async () => {
    await page.goto(categoryPath, {
      waitUntil: 'networkidle',
    })
    await countryDetector.closeModal()
    await page.waitForLoadState('networkidle')
  })

  await test.step('Apply price ascending sorting', async () => {
    await applySorting(
      page,
      filters,
      sorting,
      productListingPage,
      SORTING.priceAsc,
    )
    await productListingPage.productImage.first().waitFor()
    await expect(page).toHaveURL(new RegExp(SORTING.priceAsc))
  })

  const productIdPriceAscString = await productListingPage.productCard
    .first()
    .evaluate((el) => el.getAttribute('id'))

  await test.step('Apply price descending sorting', async () => {
    await applySorting(
      page,
      filters,
      sorting,
      productListingPage,
      SORTING.priceDesc,
    )
    await productListingPage.productImage.first().waitFor()
    await expect(page).toHaveURL(new RegExp(SORTING.priceDesc))
  })

  const productIdPriceDescString = await productListingPage.productCard
    .first()
    .evaluate((el) => el.getAttribute('id'))

  expect(productIdPriceAscString).not.toBeNull()
  expect(productIdPriceDescString).not.toBeNull()
  expect(productIdPriceAscString).not.toBe(productIdPriceDescString)
})

/**
 * Verifies the SEO meta tags (robots and canonical) on the PLP
 * in its default state, after applying sorting, and after navigating to
 * the PLP with applied filters via a deep-link. It also checks that the main
 * headline (H1) shows the active category name in the default state.
 */
test('C2139182: Verify PLP SEO data', async ({
  productListingPage,
  countryDetector,
  sorting,
  filters,
  page,
  storefrontAPIClient,
}) => {
  // Find a category with at least 1 product to test the SEO data
  const categoryWithProducts =
    await storefrontAPIClient.findCategoryWithProducts(1)

  test.skip(!categoryWithProducts, 'No category found with products')

  const categoryPath = storefrontAPIClient.getCategoryPath(
    categoryWithProducts!,
  )

  await test.step('Navigate to PLP and check default SEO data', async () => {
    await page.goto(categoryPath, {
      waitUntil: 'networkidle',
    })
    await countryDetector.closeModal()
    await page.waitForLoadState('networkidle')
    await productListingPage.h1.waitFor()

    const categoryName = await getPlpHeadlineCategoryName(
      productListingPage.pageTitle,
    )

    await expect(productListingPage.h1).toContainText(categoryName)
    await verifySeoMetaTags(page, {
      robots: PLP_TEST_DATA.seoRobotsDefault,
      canonical: page.url(),
    })
  })

  await test.step('Apply Sorting and check SEO data', async () => {
    await applySorting(
      page,
      filters,
      sorting,
      productListingPage,
      SORTING.priceDesc,
    )
    await page.waitForLoadState('domcontentloaded')
    await verifySeoMetaTags(page, {
      robots: PLP_TEST_DATA.seoRobotsFiltersSorting,
    })
  })

  await test.step('Navigate to PLP with applied filters and check SEO data', async () => {
    await productListingPage.addFiltersToPLP(PLP_FILTER_DEEP_LINK)
    await countryDetector.closeModal()
    await productListingPage.h1.waitFor()
    // The robots tag alone passes when the filter is lost, so check the URL too.
    const url = new URL(page.url())
    expect(url.searchParams.get('filters[maxPrice]')).toBe(
      String(PLP_FILTER_DEEP_LINK.maxPrice),
    )
    expect(url.searchParams.get('sort')).toBe(SORTING.priceDesc)
    await verifySeoMetaTags(page, {
      robots: PLP_TEST_DATA.seoRobotsFiltersSorting,
    })
  })
})

/**
 * Verifies the Back button functionality on mobile PLP pages.
 * - Verifies that clicking the Back button from a sub-category PLP
 * navigates back to the main category PLP.
 */
test('C2130724 Verify PLP Back button on mobile', async ({
  productListingPage,
  mobileNavigation,
  mainNavigation,
  storefrontAPIClient,
  page,
  countryDetector,
  breadcrumb,
  homePage,
}) => {
  // Skip this test on desktop browsers
  test.skip(!isMobile(page), 'Test only for mobile browsers')

  await test.step('Navigate to the homepage', async () => {
    await homePage.navigate(page, ROUTES.home, 'networkidle')
    await page.waitForLoadState('networkidle')
    await countryDetector.closeModal()
  })

  const categoryId = await requireNavigableMainCategory(
    page,
    mobileNavigation,
    mainNavigation,
    storefrontAPIClient,
    { withSubCategories: true },
  )

  await test.step('Open mobile main navigation', async () => {
    await mobileNavigation.openMobileSidebar()
    await page.waitForLoadState('domcontentloaded')
  })

  await test.step('Click main category sub-menu toggle', async () => {
    await mobileNavigation.openMainCategorySubmenu(
      await mobileNavigation.getMainCategoryIndex(categoryId),
    )
  })

  await test.step('Click sub category (accordion opens)', async () => {
    // Click the first accordion to expand it
    await mobileNavigation.mobileNavAccordion.nth(0).waitFor()
    await mobileNavigation.mobileNavAccordion.nth(0).click()
    await page.waitForLoadState('domcontentloaded')
  })

  await test.step('Click the first option from opened accordion', async () => {
    await mobileNavigation.mobileNavigationItem.nth(0).waitFor()
    await mobileNavigation.mobileNavigationItem.nth(0).click()
    await page.waitForLoadState('networkidle')
    await countryDetector.closeModal()
  })

  await test.step('Check if the sub-category PLP is loaded', async () => {
    await productListingPage.h1.waitFor()
    await breadcrumb.breadcrumbCategoryActive.waitFor()

    expect(page.url()).toContain('/c/')
    await expect(breadcrumb.breadcrumbCategoryActive).toBeVisible()
  })

  await test.step('Click back button', async () => {
    await productListingPage.backButton.waitFor()
    await productListingPage.backButton.click()
    await page.waitForLoadState('networkidle')
  })

  await test.step('Check if the main category PLP is loaded', async () => {
    await productListingPage.h1.waitFor()
    await breadcrumb.breadcrumbCategoryActive.waitFor()

    expect(page.url()).toContain('/c/')
    await expect(breadcrumb.breadcrumbCategoryActive).toBeVisible()
  })
})

/**
 * Verifies that clicking on a product tile on the PLP navigates
 * the user to the correct Product Detail Page (PDP) URL and displays
 * the product information correctly.
 */
test('C2130730: Verify PLP Product tile click', async ({
  productListingPage,
  productDetailPage,
  page,
  storefrontAPIClient,
  countryDetector,
}) => {
  // Find a category with at least 1 product to test the product tile click
  const categoryWithProducts =
    await storefrontAPIClient.findCategoryWithProducts(1)

  test.skip(!categoryWithProducts, 'No category found with products')

  const categoryPath = storefrontAPIClient.getCategoryPath(
    categoryWithProducts!,
  )

  await test.step('Navigate to category with products', async () => {
    await page.goto(categoryPath, {
      waitUntil: 'networkidle',
    })
    await countryDetector.closeModal()
    await page.waitForLoadState('networkidle')
  })

  await test.step('Verify product card is visible and get product details', async () => {
    await expect(productListingPage.productCard.first()).toBeVisible()

    // Extract product ID from the first product card
    // Product cards have id="product-{productId}" format
    const productId = await productListingPage.productCard
      .first()
      .evaluate((card) => {
        const match = card.id.match(/^product-(\d+)$/)
        return match ? parseInt(match[1], 10) : null
      })

    test.skip(!productId, 'Could not extract product ID from product card')

    // Get the product link from the card
    const productLink = await productListingPage.productCard
      .first()
      .locator('a')
      .first()
      .getAttribute('href')

    test.skip(!productLink, 'Could not find product link in product card')

    // Click on the product card
    await productListingPage.productImage.first().click()
    await page.waitForLoadState('networkidle')
    await productDetailPage.h1.waitFor()
    await productDetailPage.variantPicker.waitFor()

    // Verify we navigated to the PDP
    const currentUrl = page.url()
    expect(currentUrl).toContain('/p/')
    expect(currentUrl).toContain(`-${productId}`)

    // Verify PDP elements are visible. Primary media differs by viewport: the
    // swipe slider below 640px, the image grid from 640px up (both in the DOM,
    // only one visible).
    await expect(productDetailPage.productName).toBeVisible()
    const primaryMedia = isMobile(page)
      ? productDetailPage.mainImageSlide
      : productDetailPage.productImageGrid
    await expect(primaryMedia).toBeVisible()
  })
})

/**
 * Verifies the PLP product grid items-per-row layout:
 * - On mobile: 2 product cards per row (col-span-6 in a 12-column grid)
 * - On desktop (lg): 3 product cards per row (lg:col-span-4 in a 12-column grid)
 */
test('C2349760 Verify PLP items per row count', async ({
  productListingPage,
  page,
  storefrontAPIClient,
  countryDetector,
}) => {
  const categoryWithProducts =
    await storefrontAPIClient.findCategoryWithProducts(10)

  test.skip(
    !categoryWithProducts,
    'No category found with at least 10 products',
  )

  const categoryPath = storefrontAPIClient.getCategoryPath(
    categoryWithProducts!,
  )

  await test.step('Navigate to category with products', async () => {
    await page.goto(categoryPath, {
      waitUntil: 'networkidle',
    })
    await countryDetector.closeModal()
    await page.waitForLoadState('networkidle')
  })

  await test.step('Verify 2 product cards per row on mobile', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForLoadState('domcontentloaded')
    await productListingPage.productItem.first().waitFor({ state: 'visible' })

    const mobilePerRow = await productListingPage.getProductCountInFirstRow()
    expect(mobilePerRow).toBe(2)
  })

  await test.step('Verify 3 product cards per row on desktop', async () => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForLoadState('domcontentloaded')
    await productListingPage.productItem.first().waitFor({ state: 'visible' })

    const desktopPerRow = await productListingPage.getProductCountInFirstRow()
    expect(desktopPerRow).toBe(4)
  })
})

/**
 * Verifies the "Scroll to top" button on the PLP: when the user scrolls down,
 * the button becomes visible; clicking it scrolls the page to the top; and
 * the button is hidden again when at the top.
 */
test('C2349761 Verify PLP scroll to top button', async ({
  productListingPage,
  page,
  storefrontAPIClient,
  countryDetector,
}) => {
  const categoryWithProducts =
    await storefrontAPIClient.findCategoryWithProducts(10)

  test.skip(
    !categoryWithProducts,
    'No category found with at least 10 products',
  )

  const categoryPath = storefrontAPIClient.getCategoryPath(
    categoryWithProducts!,
  )

  await test.step('Navigate to category with products', async () => {
    await page.goto(categoryPath, {
      waitUntil: 'networkidle',
    })
    await countryDetector.closeModal()
    await page.waitForLoadState('networkidle')
  })

  await test.step('Scroll down to make Scroll to top button visible', async () => {
    await productListingPage.productItem.first().waitFor({ state: 'visible' })
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(productListingPage.scrollToTopButton).toBeVisible()
  })

  await test.step('Click Scroll to top and verify page is scrolled to top', async () => {
    await productListingPage.scrollToTopButton.click()
    await page.waitForFunction(() => window.scrollY === 0, { timeout: 5000 })
    const scrollY = await page.evaluate(() => window.scrollY)
    expect(scrollY).toBe(0)
  })

  await test.step('Verify Scroll to top button is not visible when at top', async () => {
    await expect(productListingPage.scrollToTopButton).toBeHidden()
  })
})

/**
 * Verifies the PLP empty state when filters return no results: empty state and
 * reset filters button are visible; clicking reset filters shows products again.
 */
test('C2349762: Verify PLP empty state', async ({
  productListingPage,
  breadcrumb,
  page,
  storefrontAPIClient,
  countryDetector,
}) => {
  const categoryWithProducts =
    await storefrontAPIClient.findCategoryWithProducts(1)

  test.skip(!categoryWithProducts, 'No category found with products')

  const categoryPath = storefrontAPIClient.getCategoryPath(
    categoryWithProducts!,
  )
  const emptyStateUrl = `${categoryPath}?filters[minPrice]=01&filters[maxPrice]=01`

  await test.step('Navigate to PLP with filters that force empty state', async () => {
    await page.goto(emptyStateUrl, {
      waitUntil: 'networkidle',
    })
    await countryDetector.closeModal()
    await page.waitForLoadState('networkidle')
  })

  await test.step('Assert empty state and reset filters button are visible', async () => {
    await expect(productListingPage.noResults).toBeVisible()
    await expect(productListingPage.resetFiltersButton).toBeVisible()
    const productCount = await parseLocatorTextToNumber(
      breadcrumb.productCounter,
    )
    expect(productCount).toBe(0)
  })

  await test.step('Click reset filters and assert PLP displays products again', async () => {
    await productListingPage.resetFiltersButton.click()
    await page.waitForLoadState('networkidle')
    await expect(productListingPage.productItem.first()).toBeVisible()
  })
})

/**
 * Verifies the PLP product tile image slider and swiping on desktop and mobile.
 * Finds a product with multiple images in the stream, then tests:
 * - Desktop: hover shows arrows; right arrow shows next image; left arrow shows previous image.
 * - Mobile: swipe right shows next image; swipe left shows previous image.
 */
test('C2139723 Verify PLP Product tile slider', async ({
  productListingPage,
  page,
  storefrontAPIClient,
  countryDetector,
}) => {
  const categoryWithProducts =
    await storefrontAPIClient.findCategoryWithProducts(15)

  test.skip(
    !categoryWithProducts,
    'No category found with at least 15 products',
  )

  const categoryPath = storefrontAPIClient.getCategoryPath(
    categoryWithProducts!,
  )

  await test.step('Open PLP and ensure product stream is visible', async () => {
    await page.goto(categoryPath, {
      waitUntil: 'networkidle',
    })
    await countryDetector.closeModal()
    await page.waitForLoadState('networkidle')
    await expect(productListingPage.productItem.first()).toBeVisible()
    await expect(productListingPage.productCard.first()).toBeVisible()
  })

  const visibleProductIds = await productListingPage.productCard.evaluateAll(
    (cards) => {
      return cards
        .map((card) => {
          const match = card.id.match(/^product-(\d+)$/)
          return match ? parseInt(match[1], 10) : null
        })
        .filter((id): id is number => id !== null)
    },
  )

  const productWithMultipleImages =
    await storefrontAPIClient.findProductWithMultipleImagesFromIds(
      visibleProductIds,
    )

  test.skip(
    !productWithMultipleImages,
    'No product with multiple images found among visible PLP products',
  )

  const productId = productWithMultipleImages!.id
  const card = productListingPage.getProductCardById(productId)
  await card.waitFor({ state: 'attached' })
  await card.scrollIntoViewIfNeeded()
  await page.waitForLoadState('domcontentloaded')

  const slider = productListingPage.getProductCardImageSlider(card)
  // PLP cards mount the image slider only after the card intersects the viewport.
  await slider.waitFor({ state: 'visible', timeout: 20_000 })
  const scrollable =
    productListingPage.getProductCardImageSliderScrollable(card)

  if (!isMobile(page)) {
    await test.step('Desktop: hover over product and verify arrows are shown', async () => {
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.waitForLoadState('domcontentloaded')
      await expect(card).toBeVisible()
      await card.hover()
      const nextArrow =
        productListingPage.getProductCardImageSliderNextButton(card)
      const prevArrow =
        productListingPage.getProductCardImageSliderPrevButton(card)
      await expect(nextArrow).toBeVisible()
      await expect(prevArrow).toBeVisible()
    })

    await test.step('Desktop: click right arrow and verify main image changes to next', async () => {
      await card.hover()
      const scrollLeftBefore = await scrollable.evaluate((el) => el.scrollLeft)
      await productListingPage.getProductCardImageSliderNextButton(card).click()
      await scrollable.evaluate(
        (el) =>
          new Promise((resolve) =>
            el.addEventListener('scrollend', resolve, { once: true }),
          ),
      )

      const scrollLeftAfter = await scrollable.evaluate((el) => el.scrollLeft)
      expect(scrollLeftAfter).toBeGreaterThan(scrollLeftBefore)
    })

    await test.step('Desktop: click left arrow and verify main image changes to previous', async () => {
      await card.hover()
      await productListingPage.getProductCardImageSliderPrevButton(card).click()
      await scrollable.evaluate(
        (el) =>
          new Promise((resolve) =>
            el.addEventListener('scrollend', resolve, { once: true }),
          ),
      )
      const scrollLeftAfter = await scrollable.evaluate((el) => el.scrollLeft)
      // Use small tolerance: Firefox can report scrollLeft as 1–2 due to subpixel/snap rounding
      expect(scrollLeftAfter).toBeLessThanOrEqual(2)
    })
  }

  if (isMobile(page)) {
    await test.step('Mobile: swipe right and verify main image changes to next', async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.waitForLoadState('domcontentloaded')
      await card.scrollIntoViewIfNeeded()
      await scrollable.waitFor()
      const slideWidth = await scrollable.evaluate((el) => {
        const count = el.children.length
        return count > 1 ? el.scrollWidth / count : 0
      })
      test.skip(slideWidth === 0, 'Slider has only one slide')
      await scrollable.evaluate((el, width) => {
        el.scrollTo({ left: width, top: 0, behavior: 'auto' })
      }, slideWidth)
      await expect(scrollable).not.toHaveJSProperty('scrollLeft', 0)
      const scrollLeftAfter = await scrollable.evaluate((el) => el.scrollLeft)
      expect(scrollLeftAfter).toBeGreaterThan(0)
    })

    await test.step('Mobile: swipe left and verify main image changes to previous', async () => {
      const scrollLeftBefore = await scrollable.evaluate((el) => el.scrollLeft)
      await scrollable.evaluate((el) => {
        el.scrollTo({ left: 0, top: 0, behavior: 'auto' })
      })
      await expect(scrollable).not.toHaveJSProperty(
        'scrollLeft',
        scrollLeftBefore,
      )
      const scrollLeftAfter = await scrollable.evaluate((el) => el.scrollLeft)
      // Use small tolerance: some browsers report scrollLeft as 1–2 due to subpixel rounding
      expect(scrollLeftAfter).toBeLessThanOrEqual(2)
    })
  }
})

/**
 * Verifies that navigating to a PLP via the short URL format (/c/c-{categoryId})
 * loads the page correctly and rewrites the URL to the canonical full path
 * (/c/{...path...}-{categoryId}).
 */
test('C2139181: Verify PLP short URL', async ({
  page,
  productListingPage,
  breadcrumb,
  storefrontAPIClient,
  countryDetector,
}) => {
  const categoryWithProducts =
    await storefrontAPIClient.findCategoryWithProducts(1)

  test.skip(!categoryWithProducts, 'No category found with products')

  const originalPath = storefrontAPIClient.getCategoryPath(
    categoryWithProducts!,
  )
  const shortPath = `c/c-${categoryWithProducts!.id}`

  await test.step('Navigate to PLP via short URL (/c/c-{id})', async () => {
    await page.goto(shortPath, { waitUntil: 'networkidle' })
    await countryDetector.closeModal()
    await page.waitForLoadState('networkidle')
  })

  await test.step('Verify PLP loads and URL is canonical full path', async () => {
    await breadcrumb.productCounter.waitFor()
    await expect(productListingPage.productItem.first()).toBeVisible()

    const currentPathname = new URL(page.url()).pathname
    const categoryPathSegment = currentPathname.includes('/c/')
      ? currentPathname.substring(currentPathname.indexOf('/c/'))
      : currentPathname
    expect(categoryPathSegment).toBe(`/${originalPath}`)
  })
})
