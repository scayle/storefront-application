import type { APIRequestContext, Locator, Page } from 'playwright-core'
import { expect, test } from '@playwright/test'
import type { TestInfo } from '@playwright/test'
import { BREAKPOINTS } from '../../../config/ui'
import type { MobileNavigation } from '../page-objects/components/mobileNavigation'
import type { MainNavigation } from '../page-objects/components/mainNavigation'
import type { StorefrontAPIClient } from './storefrontAPIClient'
import type { Filters } from '../page-objects/components/filters'
import type { Sorting } from '../page-objects/components/sorting'
import type { ProductListingPage } from '../page-objects/productListingPage'
import type { ProductDetailPage } from '../page-objects/productDetailPage'
import type { Search } from '../page-objects/components/search'
import { TEST_CUSTOMERS } from './constants'
import { readInertiaPageData } from './inertia'

// --- Interfaces ---
/**
 * Defines the structure for SEO options that can be verified.
 */
interface SeoOptions {
  title?: string
  description?: string
  robots?: string
  canonical?: string
}

// --- Environment & Core Helpers ---

/**
 * Retrieves a required environment variable, throwing an error if it is not set.
 * @param key The name of the environment variable.
 * @returns The value of the environment variable (guaranteed string).
 * @throws {Error} If the environment variable is not set.
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key]

  if (value === undefined) {
    throw new Error(
      `Environment variable '${key}' is required but not set. Please check your .env file or CI/CD configuration.`,
    )
  }
  return value
}

/**
 * Returns the URL of the shop's homepage. `BASE_URL` holds the origin and the country prefix
 * with a trailing slash (`https://localhost:3000/de/`), while the storefront serves a country
 * homepage without it (`/de`). A base without a country path (`https://localhost:3000/`) keeps
 * its slash, since that is how the browser reports the root.
 *
 * @param baseURL - Playwright's configured `baseURL`.
 * @returns The homepage URL, for example `https://localhost:3000/de`.
 * @throws When `baseURL` is not configured.
 */
export function getHomepageUrl(baseURL?: string): string {
  if (!baseURL) {
    throw new Error('baseURL is not configured.')
  }
  const url = new URL(baseURL)
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1)
  }
  return url.href
}

/** A country of the shop other than the default one, as the tests of the country prefix need it. */
export interface NonDefaultCountry {
  /** The country homepage, for example `https://localhost:3000/at`. */
  url: string
  /** The country prefix as a path, for example `/at`. */
  path: string
  /** The shop country ID, which the Storefront API client of that country needs. */
  shopId: number
}

/**
 * Normalizes a URL to the path of its country prefix, so `https://localhost:3000/at/` and
 * `https://localhost:3000/at` compare equal and a root URL becomes `/`.
 *
 * @param url An absolute URL.
 * @returns The path without a trailing slash, or `/` for the root.
 */
function getCountryPath(url: string): string {
  return new URL(url).pathname.replace(/\/$/, '') || '/'
}

/**
 * Builds the path of the shop under test, as requests and assertions need it.
 *
 * @param baseURL The `BASE_URL` of the run, for example `https://localhost:3000/de/`.
 * @returns The country prefix as a path without a trailing slash, for example `/de`, or an empty
 * string for a shop without a country prefix.
 */
export function getShopPath(baseURL?: string): string {
  const path = getCountryPath(getHomepageUrl(baseURL))
  return path === '/' ? '' : path
}

/**
 * Finds a country of the shop that is not the default country. The root URL tells which country
 * is the default one (it redirects there, or serves it directly), and the countries come from the
 * `availableCountries` of the homepage's Inertia payload. The country under test (`BASE_URL`) wins
 * when it is not the default one, and a country that reports itself as the default one is skipped.
 *
 * @param request The Playwright request context.
 * @param baseURL The `BASE_URL` of the run, for example `https://localhost:3000/de/`.
 * @returns The country, or `undefined` when the shop has only the default country.
 */
export async function findNonDefaultCountry(
  request: APIRequestContext,
  baseURL?: string,
): Promise<NonDefaultCountry | undefined> {
  const homepageUrl = getHomepageUrl(baseURL)
  const { origin } = new URL(homepageUrl)

  const rootResponse = await request.get(`${origin}/`, { maxRedirects: 0 })
  const rootRedirects =
    rootResponse.status() >= 300 && rootResponse.status() < 400
  const defaultPath = rootRedirects
    ? getCountryPath(new URL(rootResponse.headers().location, origin).href)
    : '/'

  const readInertiaProps = async <T>(url: string): Promise<T> => {
    const response = await request.get(url, {
      headers: { 'X-Inertia': 'true' },
    })
    expect(
      response.ok(),
      `Inertia request to ${url} answered ${response.status()}`,
    ).toBe(true)
    return ((await response.json()) as { props: T }).props
  }

  const { availableCountries = [] } = await readInertiaProps<{
    availableCountries?: { languages: { url: string }[] }[]
  }>(homepageUrl)
  const currentPath = getCountryPath(homepageUrl)
  const candidates = availableCountries
    .flatMap((country) => country.languages.map((language) => language.url))
    .filter((url) => getCountryPath(url) !== defaultPath)
  const orderedCandidates = [
    ...candidates.filter((url) => getCountryPath(url) === currentPath),
    ...candidates.filter((url) => getCountryPath(url) !== currentPath),
  ]

  for (const url of orderedCandidates) {
    const { storefront } = await readInertiaProps<{
      storefront: { country: { shopCountryId: number; isDefault?: boolean } }
    }>(url)
    if (storefront.country.isDefault) {
      continue
    }
    return {
      url,
      path: getCountryPath(url),
      shopId: storefront.country.shopCountryId,
    }
  }

  return undefined
}

/**
 * Determines if the current page is using a mobile viewport based on the configured breakpoint.
 * Returns true if the viewport width is less than BREAKPOINTS.lg, false otherwise.
 *
 * @param page - The Playwright Page object
 * @returns boolean indicating if the viewport is mobile
 */
export const isMobile = (page: Page): boolean => {
  const viewportSize = page.viewportSize()

  return !!viewportSize && viewportSize.width < BREAKPOINTS.lg
}

/**
 * Returns test customer e-mail address and password.
 * To avoid conflicts in parallel test execution, each browser has a dedicated test customer.
 * Test customer email and password keys are stored in constant object `TEST_CUSTOMERS` within `/playwright/support/constants.ts`.
 * Their values should be defined via environment variables.
 */
export const getCustomerForBrowser = (
  browserName: string,
): { email: string; password: string } => {
  const browserCustomerMap: Record<string, string> = {
    /** Should be defined via environment variable `TEST_CUSTOMER_EMAIL1` */
    chromium: 'testCustomerEmail1',
    /** Should be defined via environment variable `TEST_CUSTOMER_EMAIL2` */
    firefox: 'testCustomerEmail2',
    /** Should be defined via environment variable `TEST_CUSTOMER_EMAIL3` */
    webkit: 'testCustomerEmail3',
    /** Should be defined via environment variable `TEST_CUSTOMER_EMAIL4` */
    'mobile-chrome': 'testCustomerEmail4',
    /** Should be defined via environment variable `TEST_CUSTOMER_EMAIL5` */
    'mobile-safari': 'testCustomerEmail5',
    /** Default fallback is testCustomerEmail1, but it is strongly recommended to define dedicated test customer for every browser. */
    default: 'testCustomerEmail1',
  }

  const customerEmailKey =
    browserCustomerMap[browserName] || browserCustomerMap.default

  return {
    email: TEST_CUSTOMERS[customerEmailKey as keyof typeof TEST_CUSTOMERS],
    /** Password should be defined via environment variable TEST_CUSTOMER_PASSWORD */
    password: TEST_CUSTOMERS.testCustomerPassword,
  }
}

// --- String Manipulation & Formatting Helpers ---

/**
 * Cleans a navigation item label by removing all digits and trimming whitespace.
 * This is typically used to extract the pure category name from a label that
 * might include a product counter (e.g., "Dresses 123" becomes "Dresses").
 *
 * @param stringValue - The raw string value of the navigation item label.
 * @returns The cleaned string value without digits and leading/trailing whitespace.
 */
export const navigationItemLabel = (stringValue: string) =>
  stringValue.replace(/\d/g, '').trim()

/**
 * Returns the category name from the PLP headline (`SFCategoryHeadline`) without
 * the deferred product count spans (visible and screen-reader).
 *
 * @param headline - Locator for the `active-category-breadcrumb` h1 element.
 * @returns The trimmed category name shown as the visible page title.
 */
export async function getPlpHeadlineCategoryName(
  headline: Locator,
): Promise<string> {
  return headline.evaluate((el) => el.childNodes[0]?.textContent?.trim() ?? '')
}

/**
 * Formats an active category breadcrumb label into a URL-friendly segment.
 * It converts the string to lowercase and replaces a trailing product counter
 * (e.g., " 123") with a hyphen "-".
 * Example: "Bekleidung 123" becomes "bekleidung-"
 *
 * @param activeCategoryText - The text content of the active category breadcrumb.
 * @returns The URL-formatted string.
 */
export const formatCategoryUrlSegment = (activeCategoryText: string | null) => {
  const lowercasedText = activeCategoryText?.toLowerCase() ?? ''
  return lowercasedText.replace(/ \d+$/, '-')
}

/**
 * Random calendar date from 1970-01-01 up to and including 1999-12-31, as YYYY-MM-DD for HTML date inputs.
 * Helps E2E avoid matching an already persisted value so the submit control enables.
 *
 * The range ends well in the past on purpose. The account test writes this date onto the
 * checkout test customers, and the invoice payment method is disabled for customers below a
 * minimum age. A recent date would make the order success test fail in that run.
 */
export function randomPastBirthDate(): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const end = new Date(2000, 0, 1)
  const start = new Date(1970, 0, 1)
  const t = start.getTime() + Math.random() * (end.getTime() - start.getTime())
  const d = new Date(t)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Asynchronously extracts and parses an integer from a locator's text content
 * directly in the browser context.
 *
 * @param locator - The Playwright Locator to evaluate.
 * @returns A Promise that resolves to the parsed integer, or `null` if the
 * text is missing, empty, or contains no digits. Accepts plain integers and
 * breadcrumb meta strings such as `(24 Artikel)`.
 */
export const parseLocatorTextToNumber = (
  locator: Locator,
): Promise<number | null> => {
  return locator.evaluate((element) => {
    const text = element.textContent?.trim()

    if (!text) {
      return null
    }

    const direct = Number(text)
    if (Number.isInteger(direct)) {
      return direct
    }

    const match = text.match(/\d+/)
    if (!match) {
      return null
    }

    const parsed = parseInt(match[0], 10)
    return Number.isNaN(parsed) ? null : parsed
  })
}

// --- Test-Specific Helpers (Actions) ---

/**
 * Extracts all unique, absolute, non-mailto, non-hash links from the page.
 * Uses a single browser context operation for performance, leveraging Playwright's `locator.evaluateAll` for robustness.
 *
 * @param page - The Playwright Page object
 * @returns A Set of absolute URLs as strings
 */
export async function getAllLinksFromPage(page: Page): Promise<Set<string>> {
  const links = new Set<string>()
  const pageUrl = page.url()
  // Extract all hrefs from anchor tags using locator.evaluateAll for robustness
  const hrefs = await page
    .locator('a')
    .evaluateAll((anchors) => anchors.map((a) => a.getAttribute('href')))

  for (const link of hrefs) {
    // Warn if href is missing
    expect.soft(link, 'link is missing href attribute').not.toBeFalsy()

    // Filter out mailto and hash links, and ensure link is not null/empty
    if (
      link &&
      !link.startsWith('mailto:') &&
      !link.startsWith('#') &&
      link.trim() !== ''
    ) {
      // Convert to absolute URL
      links.add(new URL(link, pageUrl).href)
    }
  }
  return links
}

/**
 * Extracts the category ID from the href of a category link.
 * Category links end with the ID, for example `/de/c/women/shoes-42` gives `42`.
 * A link with a query string, a fragment, or a trailing slash, such as a category link with
 * Panel filters, gives `undefined`. The page objects find a category link by the end of its
 * `href`, which such a link does not match.
 *
 * @param href Link target, absolute or relative.
 * @returns The category ID, or `undefined` when the link does not point to a plain category.
 */
export function getCategoryIdFromHref(
  href: string | null | undefined,
): number | undefined {
  if (!href) {
    return undefined
  }

  const { pathname, search, hash } = new URL(href, 'https://shop.invalid')
  if (search || hash) {
    return undefined
  }

  const match = /\/c\/.+-(\d+)$/.exec(pathname)
  return match ? Number(match[1]) : undefined
}

/**
 * Reads the main navigation from the Inertia page payload and returns the categories whose
 * entries have a child with children of their own, which is the third level the mobile
 * sub-navigation shows as an accordion. The sub-navigation renders only after it opens,
 * so the payload is the only place that shows its depth up front.
 *
 * @param page The Playwright Page object, on a page that has loaded.
 * @returns The category IDs of those main entries, or `undefined` when the payload has no
 * readable navigation.
 */
export async function getMainCategoryIdsWithThirdLevel(
  page: Page,
): Promise<Set<number> | undefined> {
  type NavigationEntry = { href?: string; children?: NavigationEntry[] }
  const payload = await readInertiaPageData<{
    props?: { navigation?: NavigationEntry[] }
  }>(page)
  const entries = payload?.props?.navigation?.map((entry) => ({
    href: entry.href ?? null,
    hasThirdLevel: (entry.children ?? []).some(
      (child) => (child.children ?? []).length > 0,
    ),
  }))

  if (!entries) {
    return undefined
  }

  const categoryIds = entries
    .filter((entry) => entry.hasThirdLevel)
    .map((entry) => getCategoryIdFromHref(entry.href))
  return new Set(categoryIds.filter((id): id is number => id !== undefined))
}

/**
 * Finds a main navigation category that holds products, so a test can open it
 * without assuming which entry of the navigation that is.
 * The navigation lists the candidates, the Storefront API tells which one has products.
 * On mobile the sidebar is opened to read the navigation.
 *
 * @param page - The Playwright Page object.
 * @param mobileNavigation - The MobileNavigation Page Object.
 * @param mainNavigation - The MainNavigation Page Object.
 * @param storefrontAPIClient - Client that reads the product count of the categories.
 * @param options.withSubCategories Only consider categories that open a flyout with
 * sub-categories (desktop) or a sub-navigation with an accordion, which needs a second level of
 * sub-categories (mobile).
 * @returns The category ID of the first matching entry in navigation order, or `undefined` when none matches.
 */
async function findNavigableMainCategory(
  page: Page,
  mobileNavigation: MobileNavigation,
  mainNavigation: MainNavigation,
  storefrontAPIClient: StorefrontAPIClient,
  { withSubCategories = false }: { withSubCategories?: boolean } = {},
): Promise<number | undefined> {
  let candidates: number[]
  if (isMobile(page)) {
    await mobileNavigation.openMobileSidebar()
    candidates = await mobileNavigation.getMainCategoryIds({
      withAccordion: withSubCategories,
    })
  } else {
    candidates = await mainNavigation.getMainCategoryIds({
      withFlyout: withSubCategories,
    })
  }

  for (const categoryId of candidates) {
    if ((await storefrontAPIClient.getCategoryProductCount(categoryId)) > 0) {
      return categoryId
    }
  }
}

/**
 * Finds a main navigation category like `findNavigableMainCategory` and skips the test when
 * none matches, so the caller gets a category ID without a non-null assertion.
 *
 * @param page - The Playwright Page object.
 * @param mobileNavigation - The MobileNavigation Page Object.
 * @param mainNavigation - The MainNavigation Page Object.
 * @param storefrontAPIClient - Client that reads the product count of the categories.
 * @param options.withSubCategories Passed on to `findNavigableMainCategory`.
 * @returns The category ID of the first matching entry in navigation order.
 */
export async function requireNavigableMainCategory(
  page: Page,
  mobileNavigation: MobileNavigation,
  mainNavigation: MainNavigation,
  storefrontAPIClient: StorefrontAPIClient,
  options: { withSubCategories?: boolean } = {},
): Promise<number> {
  const categoryId = await findNavigableMainCategory(
    page,
    mobileNavigation,
    mainNavigation,
    storefrontAPIClient,
    options,
  )

  if (categoryId === undefined) {
    test.skip(
      true,
      options.withSubCategories
        ? 'No main navigation category with products and sub-categories found - skipping test'
        : 'No main navigation category with products found - skipping test',
    )
    throw new Error('Unreachable: test.skip ends the test')
  }

  return categoryId
}

/**
 * Navigates to the Product Listing Page (PLP) of a main navigation category that holds products.
 * The test skips when the navigation links to no such category.
 *
 * @param page - The Playwright Page object.
 * @param mobileNavigation - The MobileNavigation Page Object.
 * @param mainNavigation - The MainNavigation Page Object.
 * @param storefrontAPIClient - Client that reads the product count of the categories.
 */
export async function navigateToPlp(
  page: Page,
  mobileNavigation: MobileNavigation,
  mainNavigation: MainNavigation,
  storefrontAPIClient: StorefrontAPIClient,
) {
  const categoryId = await requireNavigableMainCategory(
    page,
    mobileNavigation,
    mainNavigation,
    storefrontAPIClient,
  )

  if (isMobile(page)) {
    await mobileNavigation.openMobileSidebar()
    await mobileNavigation.navigateToMainCategory(categoryId)
  } else {
    await mainNavigation.navigateToPlpMainCategory(categoryId)
  }
}

/**
 * Opens the first product on the current PLP in the PDP.
 * Scopes to the first product card and follows the image link `href` for a stable
 * full navigation with Inertia.
 *
 * @param page Current Playwright page
 * @param productListingPage Product listing page object
 * @param productDetailPage Product detail page object
 */
export async function navigateToPdpFromPlp(
  page: Page,
  productListingPage: ProductListingPage,
  productDetailPage: ProductDetailPage,
) {
  const firstProduct = productListingPage.productItem.first()
  await firstProduct.waitFor({ state: 'visible' })

  const sliderLink = firstProduct.getByTestId('product-card-image-slider-link')
  const productLink =
    (await sliderLink.count()) > 0
      ? sliderLink.first()
      : firstProduct.locator('a[href*="/p/"]').first()

  await navigateUsingLocatorHref(page, productLink)
  await productDetailPage.variantPicker.waitFor()
}

/**
 * Applies a sorting option on a Product Listing Page (PLP), adapting the interaction
 * based on whether the current context is mobile or desktop.
 * This function encapsulates the device-specific sorting flow.
 *
 * @param page - The Playwright Page object.
 * @param filters - The Filters Page Object (must extend Base to have responsiveIndex).
 * @param sorting - The Sorting Page Object (must extend Base).
 * @param _plp - The ProductListingPage Page Object (call sites pass it for a consistent API; unused in the current flow).
 * @param sortingOption - The specific sorting parameter to apply (e.g., 'price_desc', 'price_asc').
 */
export async function applySorting(
  page: Page,
  filters: Filters,
  sorting: Sorting,
  _plp: ProductListingPage,
  sortingOption: string,
) {
  if (isMobile(page)) {
    await filters.buttonOpenFilters.click()
    await sorting.applySortingMobile(sortingOption)
    await filters.closeFiltersButton.click()
  } else {
    await sorting.applySortingDesktop(sortingOption, 0)
  }
}

/**
 * Follows a link by reading its `href` and calling `page.goto`.
 * Playwright clicks on Inertia `<Link>` often do not line up with navigation assertions because the
 * client visit does not emit a full document load. Using the rendered `href` matches opening the
 * same URL in a new tab and yields a stable full navigation for tests.
 *
 * @param page Current Playwright page
 * @param link Locator for the anchor that exposes `href`
 */
export async function navigateUsingLocatorHref(
  page: Page,
  link: Locator,
): Promise<void> {
  await link.waitFor({ state: 'visible' })
  await expect(link).toHaveAttribute('href', /^(?!#).+/)
  const raw = await link.getAttribute('href')
  const href = raw?.trim() ?? ''
  if (!href || href === '#') {
    throw new Error(
      'Link has no usable href. Search suggestions may still be loading.',
    )
  }
  await page.goto(href, { waitUntil: 'domcontentloaded' })
}

/**
 * Executes a search operation based on the current device (mobile or desktop).
 * This function encapsulates the device-specific search execution flow and handles
 * different post-typing actions (e.g., pressing Enter, clicking a suggestion).
 *
 * @param page - The Playwright Page object.
 * @param mobileNavigation - The MobileNavigation Page Object.
 * @param search - The Search Page Object.
 * @param searchTerm - The term to search for.
 * @param action - Optional. Defines how the search is completed.
 * 'enter': (Default) Submits by pressing Enter.
 * 'clickSuggestion': Clicks the first search suggestion.
 * 'typeOnly': Only types the search term, no submission.
 * 'clickMoreResults': Opens "See all results" via `href` + `goto` (stable with Inertia).
 */
export async function executeSearch(
  page: Page,
  mobileNavigation: MobileNavigation,
  search: Search,
  searchTerm: string,
  action:
    'enter' | 'clickSuggestion' | 'typeOnly' | 'clickMoreResults' = 'enter',
) {
  if (isMobile(page)) {
    await mobileNavigation.executeSearchMobile(searchTerm, action)
  } else {
    await search.executeSearchDesktop(searchTerm, action)
  }
}

/**
 * Clears, focuses, and fills a given input field.
 * @param locator The Playwright locator for the input element.
 * @param value The text value to fill the input with.
 */
export async function fillInput(
  locator: Locator,
  value: string,
): Promise<void> {
  await locator.clear()
  await locator.focus()
  await locator.fill(value)
}

// --- Test-Specific Helpers (Assertions) ---

/**
 * Verifies various SEO (Search Engine Optimization) meta tags and attributes on a given page.
 * This function checks for the presence and correctness of the page title, meta description,
 * robots tag, and canonical link based on the provided options.
 *
 * @param page - The Playwright Page object representing the current web page.
 * @param options - An object containing the SEO properties to verify.
 * Only properties explicitly defined in this object will be checked.
 */
export async function verifySeoMetaTags(page: Page, options: SeoOptions) {
  if (options.title) {
    await expect(page).toHaveTitle(options.title)
  }

  if (options.description) {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      options.description,
    )
  }

  if (options.robots) {
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      options.robots,
    )
  }

  if (options.canonical) {
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      options.canonical,
    )
  }
}

/**
 * Asserts the visibility of filter and sort buttons on a Product Listing Page (PLP),
 * adapting assertions based on whether the device is mobile or desktop.
 *
 * @param page - The Playwright Page object.
 * @param filters - The Filters Page Object.
 * @param sorting - The Sorting Page Object.
 */
export async function assertFilterAndSortButtons(
  page: Page,
  filters: Filters,
  sorting: Sorting,
) {
  if (isMobile(page)) {
    await expect(filters.buttonOpenFilters).toBeVisible()
  } else {
    await expect(sorting.sortDropdown).toBeVisible()
    await expect(filters.buttonOpenFilters).toBeVisible()
  }
}

/** The status codes of a response do not depend on the browser, so one project covers them. */
const STATUS_CODE_PROJECT = 'chromium'

const STATUS_CODE_SKIP_REASON =
  'The status codes do not depend on the browser, so only chromium runs them'

/**
 * Skips the running test unless it runs in the project that covers status codes.
 * Call it from a `beforeEach` of tests that read status codes with `maxRedirects: 0`.
 *
 * @param testInfo The `TestInfo` of the running test.
 */
export function skipUnlessStatusCodeProject(testInfo: TestInfo): void {
  test.skip(
    testInfo.project.name !== STATUS_CODE_PROJECT,
    STATUS_CODE_SKIP_REASON,
  )
}
