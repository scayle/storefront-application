import { expect } from '@playwright/test'
import type { Product } from '@scayle/storefront-api'
import type { StorefrontAPIClient } from '../../support/storefrontAPIClient'
import { test } from '../../fixtures/fixtures'
import { EXTERNAL_SEARCH_TERM, ROUTES } from '../../support/constants'
import {
  getProductBrandLabel,
  isProductSellableNow,
  isVariantBuyableNow,
  skipForCatalogGap,
} from '../../support/productTestHelpers'
import {
  executeSearch,
  getHomepageUrl,
  navigateUsingLocatorHref,
  skipUnlessStatusCodeProject,
} from '../../support/utils'

/**
 * Verifies that when a search term with no matching results is entered,
 * the user is navigated to a no results page with the correct URL and headline
 * that contains entered search term.
 */
test('C2139814: Verify Search no results page', async ({
  search,
  page,
  mobileNavigation,
  homePage,
  countryDetector,
}) => {
  await homePage.navigate(page, ROUTES.home, 'networkidle')
  await page.waitForLoadState('networkidle')
  await countryDetector.closeModal()

  await expect(async () => {
    await executeSearch(
      page,
      mobileNavigation,
      search,
      'noresultstest',
      'enter',
    )

    await expect(page).toHaveURL(
      /\/search\?(?:.*)(?:filters\[term\]|filters%5Bterm%5D)=noresultstest/,
    )
    await expect(search.searchResultsHeadline.first()).toBeVisible()
    await search.assertHeadlineSearchResults('noresultstest')
  }).toPass({ timeout: 30_000 })
})

/**
 * Verifies that when a valid product search term is entered,
 * the user is navigated to a search results page that contains returned products.
 * The Storefront API picks a term that search does not redirect to a category, product or
 * navigation item, because a brand or category name would skip the results page.
 */
test('C2130650: Verify Search results page', async ({
  search,
  page,
  mobileNavigation,
  storefrontAPIClient,
  countryDetector,
}) => {
  const foundTerm =
    await storefrontAPIClient.findSearchTermThatOpensResultsPage()

  skipForCatalogGap(
    'C2130650',
    !foundTerm,
    'Catalog gap: need a search term that opens the results page instead of redirecting to a category or product.',
  )

  const searchTerm = foundTerm as string

  await countryDetector.closeModal()

  await executeSearch(page, mobileNavigation, search, searchTerm, 'enter')
  await page.waitForLoadState('networkidle')

  await search.h1.first().waitFor()
  await search.searchResultsProductImage.first().waitFor()

  await expect(page).toHaveURL(
    (url) =>
      url.pathname.endsWith('/search') &&
      url.searchParams.get('filters[term]') === searchTerm,
  )
  await expect(search.searchResultsProductImage.first()).toBeVisible()
  await search.assertHeadlineSearchResults(searchTerm)
})

/**
 * Verifies that when typing a category-related search term,
 * relevant suggestions appear and clicking a suggestion navigates to the correct PLP.
 * Search term is fetched using the Storefront API client and it contains a category name.
 */
test('C2130721: Verify Search suggestions', async ({
  search,
  mobileNavigation,
  page,
  productListingPage,
  storefrontAPIClient,
  countryDetector,
}) => {
  const rootCategories = await storefrontAPIClient.getRootCategories()

  test.skip(
    !rootCategories || rootCategories.length === 0,
    'No categories found - skipping test',
  )

  // Use the first root category name for search
  const categoryName = rootCategories[0].name

  await countryDetector.closeModal()

  await expect(async () => {
    await executeSearch(
      page,
      mobileNavigation,
      search,
      categoryName,
      'clickSuggestion',
    )
    await productListingPage.h1.waitFor()
    expect(page.url()).toContain(categoryName.toLowerCase())
  }).toPass()
})

/**
 * Verifies that when typing a search term with suggestions, clicking the
 * "See all results" button navigates to the search results page
 * with visible product stream and headline containing the search term.
 * The Storefront API picks a term that search does not redirect to a category, product or
 * navigation item, because a brand or category name would skip the results page.
 */
test('C2132124: Verify Search suggestions "See all results" button', async ({
  search,
  mobileNavigation,
  page,
  storefrontAPIClient,
  countryDetector,
}) => {
  const foundTerm =
    await storefrontAPIClient.findSearchTermThatOpensResultsPage()

  skipForCatalogGap(
    'C2132124',
    !foundTerm,
    'Catalog gap: need a search term that opens the results page instead of redirecting to a category or product.',
  )

  const searchTerm = foundTerm as string

  await countryDetector.closeModal()
  await executeSearch(
    page,
    mobileNavigation,
    search,
    searchTerm,
    'clickMoreResults',
  )

  await expect(page).toHaveURL(
    (url) =>
      url.pathname.endsWith('/search') &&
      url.searchParams.get('filters[term]') === searchTerm,
    { timeout: 15_000 },
  )
  await expect(search.searchResultsProductImage.first()).toBeVisible()
  await search.assertHeadlineSearchResults(searchTerm)
})

/**
 * Verifies that when typing an exact product ID,
 * a suggestion appears, and clicking it navigates directly to the product detail page (PDP).
 * The product is resolved via the Storefront API client using sellability rules (active,
 * timeframe, stock or sellable-without-stock) so the PDP matches a product customers/users can buy.
 */
test('C2132173: Verify Search suggestions exact product match', async ({
  search,
  page,
  mobileNavigation,
  storefrontAPIClient,
  countryDetector,
  productDetailPage,
}) => {
  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      isProductSellableNow(product) &&
      (product.variants?.some(isVariantBuyableNow) ?? false),
  )

  test.skip(!productData, 'No sellable product found - skipping test')

  const productId = String((productData as Product).id)

  await countryDetector.closeModal()

  await expect(async () => {
    await executeSearch(
      page,
      mobileNavigation,
      search,
      productId,
      'clickSuggestion',
    )
    expect(page.url()).toContain(productId)
    await expect(productDetailPage.productName).toBeVisible()
  }).toPass({ timeout: 30_000 })
})

/**
 * Verifies filters on the search results page: open the drawer and interact
 * with price inputs (always), apply a distinct max-price when the band is wide
 * enough, apply a color filter, then reset. A narrow price band skips only the
 * price submission — color and reset still run so drawer regressions surface.
 * Search term is fetched using the Storefront API client and it contains a product brand.
 */
test('C2140718: Verify Search results page Filters', async ({
  search,
  page,
  mobileNavigation,
  filters,
  productListingPage,
  storefrontAPIClient,
  countryDetector,
}) => {
  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      product.isActive &&
      Boolean(getProductBrandLabel(product)) &&
      (product.variants?.some((variant) => variant.stock?.quantity > 1) ??
        false),
  )

  skipForCatalogGap(
    'C2140718',
    !productData,
    'Catalog gap: need an active in-stock product with a brand attribute label (used as the search term).',
  )

  const productBrand = getProductBrandLabel(productData as Product)!

  await countryDetector.closeModal()

  await test.step('Search for a term and check Filter initial state', async () => {
    await executeSearch(page, mobileNavigation, search, productBrand, 'enter')
    await productListingPage.h1.waitFor()
    await expect(filters.filterCounter).toBeHidden()
  })

  // Price apply needs a wide enough band; filter open/input interaction,
  // color apply, and reset must still run when that band is too narrow so a
  // broken filter drawer cannot hide behind a skip.
  let priceFilterApplied = false

  await test.step('Open filters and interact with price inputs', async () => {
    await filters.buttonOpenFilters.click()
    await filters.closeFiltersButton.waitFor()
    await expect(filters.closeFiltersButton).toBeVisible()

    const minInput = filters.filterPriceInput.first()
    const maxInput = filters.filterPriceInput.nth(1)

    await expect(minInput).toBeVisible()
    await expect(maxInput).toBeVisible()

    const parseDisplayedPrice = (raw: string) =>
      Number.parseFloat(raw.replace(/[^\d.,]/g, '').replace(',', '.'))

    await minInput.click()
    const currentMin = parseDisplayedPrice(await minInput.inputValue())
    await maxInput.click()
    const currentMax = parseDisplayedPrice(await maxInput.inputValue())

    expect(
      Number.isFinite(currentMin) && Number.isFinite(currentMax),
      'Price filter inputs must expose finite min/max values',
    ).toBe(true)
    expect(
      currentMax > currentMin,
      'Price filter max must be greater than min',
    ).toBe(true)

    // Midpoint fill is a no-op when the band is narrower than 1 display unit
    // (floor lands on min or max and the filter is treated as unset).
    const newMax = Math.floor((currentMin + currentMax) / 2)

    // Catalog-dependent: narrow bands must not abort color/reset via test.skip.
    /* eslint-disable playwright/no-conditional-in-test -- keep drawer coverage when price band is too narrow */
    if (newMax <= currentMin || newMax >= currentMax) {
      await filters.closeFiltersButton.click()
      return
    }
    /* eslint-enable playwright/no-conditional-in-test */

    const maxPriceCents = newMax * 100

    await maxInput.clear()
    await maxInput.fill(String(newMax))
    await maxInput.press('Tab')
    await filters.filterApplyButton.click()
    await page.waitForURL(
      (url) =>
        url.searchParams.get('filters[maxPrice]') === String(maxPriceCents),
    )

    await filters.filterCounter.waitFor()
    await expect(filters.filterCounter).toHaveText('1')
    priceFilterApplied = true
  })

  await test.step('Apply color filter and check filter counter', async () => {
    await filters.buttonOpenFilters.click()
    await filters.closeFiltersButton.waitFor()
    await filters.filterColorChip.first().scrollIntoViewIfNeeded()
    await page.waitForLoadState('domcontentloaded')
    await filters.filterColorChip.first().setChecked(true)
    await filters.filterApplyButton.waitFor()
    await filters.filterApplyButton.scrollIntoViewIfNeeded()
    await filters.filterApplyButton.click()
    await filters.filterCounter.waitFor()

    await expect(filters.filterCounter).toBeVisible()
    // eslint-disable-next-line playwright/no-conditional-in-test -- counter depends on whether price apply ran above
    const expectedFilterCount = priceFilterApplied ? '2' : '1'
    await expect(filters.filterCounter).toHaveText(expectedFilterCount)
  })

  await test.step('Reset filters and check filter counter', async () => {
    await filters.buttonOpenFilters.click()
    await filters.filterResetButton.scrollIntoViewIfNeeded()
    await filters.filterResetButton.click()
    await page.waitForLoadState('domcontentloaded')
    await filters.closeFiltersButton.click()

    await expect(filters.filterCounter).toBeHidden()
  })
})

/**
 * Verifies that when typing a search term that matches tags,
 * relevant tags are displayed in the suggestions, and clicking a tag
 * applies a corresponding filter.
 * Search term is built from catalog color, category, and size, then confirmed
 * against search v2 so the suggestions actually include filter tags.
 * Example search term: "white jacket 32".
 */
test('C2162007: Verify Search suggestions tags', async ({
  search,
  page,
  mobileNavigation,
  filters,
  storefrontAPIClient,
  countryDetector,
}) => {
  const searchTerm =
    await storefrontAPIClient.findSearchTermWithSuggestionFilterTags()

  test.skip(
    !searchTerm,
    'No catalog search term produced suggestion filter tags - skipping test',
  )

  await countryDetector.closeModal()

  await executeSearch(
    page,
    mobileNavigation,
    search,
    searchTerm as string,
    'typeOnly',
  )
  await expect(search.searchSuggestionsTagGroup.first()).toBeVisible({
    timeout: 15_000,
  })

  // The badge counts filter groups (Color, Size), not one chip per value.
  const tagTexts = await search.searchSuggestionsTagGroup
    .first()
    .locator(search.searchSuggestionsTag)
    .allTextContents()
  const expectedFilterCount = new Set(
    tagTexts
      .map((text) => text.split(':')[0]?.trim())
      .filter((label): label is string => Boolean(label)),
  ).size

  expect(expectedFilterCount).toBeGreaterThan(0)

  await navigateUsingLocatorHref(page, search.firstTaggedSearchSuggestion())
  await expect(page).toHaveURL(/filters(\[|%5B)/)
  await expect(filters.filterCounter).toHaveText(String(expectedFilterCount))
})

/**
 * Verifies that when an exact product ID is entered into the
 * search input and Enter is pressed, the user is redirected to the
 * corresponding Product Detail Page (PDP).
 * Search term is fetched using the Storefront API client and it contains a product ID.
 */
test('C2170825 Verify Search returns PDP on exact product ID pressing Enter', async ({
  search,
  page,
  mobileNavigation,
  storefrontAPIClient,
  countryDetector,
  productDetailPage,
}) => {
  const productData = await storefrontAPIClient.findProduct(
    (product) =>
      product.isActive && // must be active
      (product.variants?.some((variant) => variant.stock?.quantity > 1) ??
        false),
  )

  test.skip(!productData, 'No product found - skipping test')

  const productId = String((productData as Product).id)

  await countryDetector.closeModal()

  await executeSearch(page, mobileNavigation, search, productId, 'enter')

  await expect(async () => {
    await page.waitForURL(new RegExp(productId), { timeout: 5_000 })
    await expect(productDetailPage.productName).toBeVisible()
  }).toPass({ timeout: 30_000 })
})

/**
 * Verifies that when a valid Reference Key of a product is
 * entered into the search input and Enter is pressed, the user is
 * redirected to the corresponding Product Detail Page (PDP).
 * Search term is a catalog reference key that search v2 resolve maps to a product.
 */
test('C2171031 Verify Search returns product for matching Reference Key', async ({
  search,
  page,
  mobileNavigation,
  storefrontAPIClient,
  countryDetector,
  productDetailPage,
}) => {
  const productReferenceKey =
    await storefrontAPIClient.findReferenceKeyThatResolvesToProduct()

  test.skip(
    !productReferenceKey,
    'No product reference key resolved to a PDP - skipping test',
  )

  await countryDetector.closeModal()

  await executeSearch(
    page,
    mobileNavigation,
    search,
    productReferenceKey as string,
    'enter',
  )

  await expect(page).toHaveURL(/\/p\//)
  await expect(productDetailPage.productName).toBeVisible()
})

/**
 * Verifies that a search that resolves to a product keeps the country when it runs in a
 * country other than the default one. Before the fix the redirect went to the default country.
 * Needs a shop with at least two countries, the test skips otherwise. The reference key comes
 * from the Storefront API of the non-default country, because its catalog can differ from the
 * default country's.
 */
test('C2661285: Verify Search for a product keeps the country in a non-default country', async ({
  page,
  search,
  mobileNavigation,
  countryDetector,
  productDetailPage,
  nonDefaultCountry,
  nonDefaultCountryAPIClient,
}) => {
  const referenceKey =
    await nonDefaultCountryAPIClient.findReferenceKeyThatResolvesToProduct()
  skipForCatalogGap(
    'C2661285',
    !referenceKey,
    'No product reference key resolved to a PDP in the non-default country',
  )

  await page.goto(nonDefaultCountry.url, { waitUntil: 'domcontentloaded' })
  await countryDetector.closeModal()

  await executeSearch(
    page,
    mobileNavigation,
    search,
    referenceKey as string,
    'enter',
  )

  await expect(page).toHaveURL((url) =>
    url.pathname.startsWith(`${nonDefaultCountry.path}/p/`),
  )
  await expect(productDetailPage.productName).toBeVisible()
})

/**
 * Verifies that a search that resolves to a category keeps the country when it runs in a
 * country other than the default one. Before the fix the redirect went to the default country.
 * Needs a shop with at least two countries, the test skips otherwise. The category name comes
 * from the Storefront API of the non-default country.
 */
test('C2661286: Verify Search for a category keeps the country in a non-default country', async ({
  page,
  search,
  mobileNavigation,
  countryDetector,
  productListingPage,
  nonDefaultCountry,
  nonDefaultCountryAPIClient,
}) => {
  const categoryName =
    await nonDefaultCountryAPIClient.findCategoryNameThatResolvesToCategory()
  skipForCatalogGap(
    'C2661286',
    !categoryName,
    'No category name resolved to a PLP in the non-default country',
  )

  await page.goto(nonDefaultCountry.url, { waitUntil: 'domcontentloaded' })
  await countryDetector.closeModal()

  await executeSearch(
    page,
    mobileNavigation,
    search,
    categoryName as string,
    'enter',
  )

  await expect(page).toHaveURL((url) =>
    url.pathname.startsWith(`${nonDefaultCountry.path}/c/`),
  )
  await expect(productListingPage.productCard.first()).toBeVisible()
})

/**
 * The search URL of a country, as a user types it into the address bar. The server answers it
 * with a redirect when the term resolves to a product or a category.
 *
 * @param countryUrl The country homepage, for example `https://localhost:3000/at`.
 * @param term The search term.
 * @returns The absolute search URL of that country.
 */
function getCountrySearchUrl(countryUrl: string, term: string): string {
  return `${countryUrl}/search?${new URLSearchParams({ 'filters[term]': term })}`
}

/**
 * The server redirects a search URL whose term resolves to a product or a category. The header
 * search above does not request that URL, because its browser code resolves the term through the
 * `search/resolve` RPC and navigates itself. These tests request the URL without following the
 * redirect, so they check the redirect of the server in a country other than the default one.
 */
test.describe('Search URL in a non-default country', () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessStatusCodeProject(testInfo)
  })

  /**
   * Verifies that the search URL of a non-default country, with a term that resolves to a
   * product, redirects (302) to the product page of that country. Before the fix the redirect
   * dropped the country prefix and ended in the default country. Needs a shop with at least two
   * countries, the test skips otherwise.
   */
  test('C2663543: Verify Search URL for a product keeps the country in a non-default country', async ({
    request,
    nonDefaultCountry,
    nonDefaultCountryAPIClient,
  }) => {
    const referenceKey =
      await nonDefaultCountryAPIClient.findReferenceKeyThatResolvesToProduct()
    skipForCatalogGap(
      'C2663543',
      !referenceKey,
      'No product reference key resolved to a PDP in the non-default country',
    )

    const response = await request.get(
      getCountrySearchUrl(nonDefaultCountry.url, referenceKey as string),
      { maxRedirects: 0 },
    )

    expect(response.status()).toBe(302)
    const target = new URL(response.headers().location, response.url())
    expect(target.pathname).toMatch(
      new RegExp(`^${nonDefaultCountry.path}/p/[^/]+-\\d+$`),
    )
  })

  /**
   * Verifies that the search URL of a non-default country, with a term that resolves to a
   * category, redirects (302) to the category page of that country. Before the fix the redirect
   * dropped the country prefix and ended in the default country. Needs a shop with at least two
   * countries, the test skips otherwise.
   */
  test('C2663544: Verify Search URL for a category keeps the country in a non-default country', async ({
    request,
    nonDefaultCountry,
    nonDefaultCountryAPIClient,
  }) => {
    const categoryName =
      await nonDefaultCountryAPIClient.findCategoryNameThatResolvesToCategory()
    skipForCatalogGap(
      'C2663544',
      !categoryName,
      'No category name resolved to a PLP in the non-default country',
    )

    const response = await request.get(
      getCountrySearchUrl(nonDefaultCountry.url, categoryName as string),
      { maxRedirects: 0 },
    )

    expect(response.status()).toBe(302)
    const target = new URL(response.headers().location, response.url())
    expect(target.pathname).toMatch(
      new RegExp(`^${nonDefaultCountry.path}/c/.+-\\d+$`),
    )
  })

  /**
   * Verifies that the search URL of a non-default country answers 200 for a term that opens the
   * results page. The other tests here use terms that redirect, so they would not notice a
   * country whose search fails, for example one without searchable attributes in the Panel.
   * Needs a shop with at least two countries, the test skips otherwise.
   */
  test('C2663545: Verify Search URL for a results page answers 200 in a non-default country', async ({
    request,
    nonDefaultCountry,
    nonDefaultCountryAPIClient,
  }) => {
    const term =
      await nonDefaultCountryAPIClient.findSearchTermThatOpensResultsPage()
    skipForCatalogGap(
      'C2663545',
      !term,
      'No search term opened the results page in the non-default country',
    )

    const response = await request.get(
      getCountrySearchUrl(nonDefaultCountry.url, term as string),
      { maxRedirects: 0 },
    )

    expect(response.status()).toBe(200)
  })
})

/**
 * Builds the search URL of the external search term, relative to `BASE_URL`.
 *
 * @returns The path with the term in `filters[term]`, for example `search?filters%5Bterm%5D=...`.
 */
function getExternalSearchPath(): string {
  return `search?${new URLSearchParams({ 'filters[term]': EXTERNAL_SEARCH_TERM })}`
}

/**
 * Asks the Storefront API where the external search term leads. The answer does not come from
 * the shop under test, so a shop that stops redirecting fails the tests instead of skipping them.
 * Skips when the Storefront API does not resolve the term to a navigation item with an external
 * `https` link, which means the shop data is missing.
 *
 * @param storefrontAPIClient The Storefront API client of the country under test.
 * @returns The external URL the term must lead to.
 */
async function getExternalSearchTarget(
  storefrontAPIClient: StorefrontAPIClient,
): Promise<URL> {
  const target =
    await storefrontAPIClient.resolveExternalSearchTerm(EXTERNAL_SEARCH_TERM)
  test.skip(
    !target,
    `The Storefront API does not resolve "${EXTERNAL_SEARCH_TERM}" to an external https URL, see SETUP.md - skipping test`,
  )
  return target as URL
}

/**
 * The external search link tests need a navigation item with an external link, "Include to
 * Search" ticked, and a navigation synonym for the term (see SETUP.md). The term is
 * `EXTERNAL_SEARCH_TERM` in `support/constants.ts`, and the tests skip when the Storefront API
 * does not resolve it to an external URL.
 */
test.describe('Search term for an external link', () => {
  test.describe('status codes', () => {
    test.beforeEach(({}, testInfo) => {
      skipUnlessStatusCodeProject(testInfo)
    })

    /**
     * Verifies that a search term that points to an external URL redirects (302) to it on a full
     * page load, with no Inertia location header.
     */
    test('C2661287: Verify Search term for an external link opens the external page on a full page load', async ({
      request,
      storefrontAPIClient,
    }) => {
      const externalUrl = await getExternalSearchTarget(storefrontAPIClient)

      const response = await request.get(getExternalSearchPath(), {
        maxRedirects: 0,
      })

      expect(response.status()).toBe(302)
      expect(new URL(response.headers().location, response.url()).href).toBe(
        externalUrl.href,
      )
      expect(response.headers()['x-inertia-location']).toBeUndefined()
    })

    /**
     * Verifies that an Inertia request for the external search term gets a 409 with the external
     * URL in `X-Inertia-Location`, so the browser does a full page load instead of following a
     * redirect in the background.
     */
    test('C2661288: Verify Search term for an external link answers an Inertia request with a full page load instruction', async ({
      request,
      storefrontAPIClient,
    }) => {
      const externalUrl = await getExternalSearchTarget(storefrontAPIClient)

      const response = await request.get(getExternalSearchPath(), {
        maxRedirects: 0,
        headers: { 'X-Inertia': 'true' },
      })

      expect(response.status()).toBe(409)
      expect(new URL(response.headers()['x-inertia-location']).href).toBe(
        externalUrl.href,
      )
    })
  })

  /**
   * Verifies that the header search loads the external page with a full page load: the browser
   * leaves the shop, and the console shows no CORS error, which a background redirect to another
   * origin would cause. The test waits for any origin other than the shop's, because the external
   * page can redirect again on its own.
   */
  test('C2661289: Verify Header search for an external link term loads the external page', async ({
    page,
    baseURL,
    storefrontAPIClient,
    search,
    mobileNavigation,
    countryDetector,
  }) => {
    await getExternalSearchTarget(storefrontAPIClient)
    const shopOrigin = new URL(getHomepageUrl(baseURL)).origin

    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text())
      }
    })

    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' })
    await countryDetector.closeModal()

    await executeSearch(
      page,
      mobileNavigation,
      search,
      EXTERNAL_SEARCH_TERM,
      'enter',
    )

    await page.waitForURL((url) => url.origin !== shopOrigin, {
      waitUntil: 'commit',
    })
    expect(
      consoleErrors.filter((text) => /cors|access control/i.test(text)),
    ).toEqual([])
  })
})
