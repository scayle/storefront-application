import type { Page } from 'playwright-core'
import { expect } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import { getHomepageUrl, isMobile } from '../../support/utils'
import { isProductSellableNow } from '../../support/productTestHelpers'
import { ROUTES, CUSTOMER_ACCOUNT } from '../../support/constants'
import { authState } from '../../support/auth'
import type { StorefrontAPIClient } from '../../support/storefrontAPIClient'
import type { MobileNavigation } from '../../page-objects/components/mobileNavigation'
import type { MainNavigation } from '../../page-objects/components/mainNavigation'
import type { ProductListingPage } from '../../page-objects/productListingPage'
import type { ProductDetailPage } from '../../page-objects/productDetailPage'
import type { CountryDetector } from '../../page-objects/components/countryDetector'
import type { Header } from '../../page-objects/components/header'

interface NavigationFixtures {
  countryDetector: CountryDetector
  mobileNavigation: MobileNavigation
  mainNavigation: MainNavigation
  productListingPage: ProductListingPage
  productDetailPage: ProductDetailPage
  storefrontAPIClient: StorefrontAPIClient
}

/** Fixtures the signed-in checks use on top of the ones that navigate. */
interface LoggedInFixtures extends NavigationFixtures {
  header: Header
}

/**
 * Path of a category that holds products, or `null` when the shop has none.
 * Cached after the first lookup, so a shop without one scans the catalog once.
 */
let resolvedPlpPath: string | null | undefined

async function ensurePlpPath(storefrontAPIClient: StorefrontAPIClient) {
  if (resolvedPlpPath === undefined) {
    const categoryWithProducts =
      await storefrontAPIClient.findCategoryWithProducts(1)
    resolvedPlpPath = categoryWithProducts
      ? storefrontAPIClient.getCategoryPath(categoryWithProducts)
      : null
  }

  test.skip(
    resolvedPlpPath === null,
    'No category with products found - skipping test',
  )
  return resolvedPlpPath!
}

/**
 * Path of a product whose detail page renders the variant picker, or `null` when the shop
 * has none. The picker renders for every product that is not sold out and inside its
 * sellable timeframe. Cached after the first lookup, so a shop without one scans the
 * catalog once.
 */
let resolvedPdpPath: string | null | undefined

async function ensurePdpPath(storefrontAPIClient: StorefrontAPIClient) {
  if (resolvedPdpPath === undefined) {
    const product = await storefrontAPIClient.findProduct(isProductSellableNow)
    resolvedPdpPath = product ? `p/p-${product.id}` : null
  }

  test.skip(
    resolvedPdpPath === null,
    'No sellable product found - skipping test',
  )
  return resolvedPdpPath!
}

const PAGE_TYPES = {
  homepage: {
    name: 'Homepage',
    navigate: async (page: Page) => {
      await page.goto(ROUTES.home, {
        waitUntil: 'domcontentloaded',
      })
    },
  },
  plp: {
    name: 'Product Listing Page (PLP)',
    navigate: async (page: Page, fixtures: NavigationFixtures) => {
      const plpPath = await ensurePlpPath(fixtures.storefrontAPIClient)
      await page.goto(plpPath, {
        waitUntil: 'domcontentloaded',
      })
      await fixtures.countryDetector.closeModal()
      await fixtures.productListingPage.productItem
        .first()
        .waitFor({ state: 'visible' })
    },
  },
  pdp: {
    name: 'Product Detail Page (PDP)',
    navigate: async (page: Page, fixtures: NavigationFixtures) => {
      const pdpPath = await ensurePdpPath(fixtures.storefrontAPIClient)
      await page.goto(pdpPath, {
        waitUntil: 'domcontentloaded',
      })
      await fixtures.countryDetector.closeModal()
      await fixtures.productDetailPage.variantPicker.waitFor()
    },
  },
  wishlist: {
    name: 'Wishlist',
    navigate: async (page: Page) => {
      await page.goto(ROUTES.wishlist, {
        waitUntil: 'domcontentloaded',
      })
    },
  },
  basket: {
    name: 'Basket',
    navigate: async (page: Page) => {
      await page.goto(ROUTES.basket, {
        waitUntil: 'domcontentloaded',
      })
    },
  },
  account: {
    name: 'Account',
    navigate: async (page: Page) => {
      await page.goto(ROUTES.account, {
        waitUntil: 'domcontentloaded',
      })
    },
  },
  signin: {
    name: 'Sign In',
    navigate: async (page: Page) => {
      await page.goto(ROUTES.signin, {
        waitUntil: 'domcontentloaded',
      })
    },
  },
} as const

type LoggedInPageType =
  'homepage' | 'plp' | 'pdp' | 'wishlist' | 'basket' | 'account'

function attachHydrationConsoleGuard(page: Page) {
  page.on('console', (message) => {
    if (
      (message.type() === 'warning' || message.type() === 'error') &&
      /hydration/i.test(message.text())
    ) {
      const args = message.args()
      const formattedArgs = args.map((arg) => arg.toString()).join(' ')
      throw new Error(
        `Hydration problem detected: ${message.text()}\nArguments: ${formattedArgs}`,
      )
    }
  })
}

async function assertLoggedInPageReady(
  pageType: LoggedInPageType,
  page: Page,
  fixtures: LoggedInFixtures,
  homepageUrl: string,
) {
  // Most page checks below also pass for a guest. The header account popover stays mounted on every
  // viewport and greets the customer by name only once `customer` has loaded for a signed-in session.
  await expect(fixtures.header.userFlyoutGreetingFirstname).toBeAttached()

  switch (pageType) {
    case 'homepage':
      await expect(page).toHaveURL(homepageUrl)
      await expect(page.getByTestId('main-content')).toBeVisible()
      break
    case 'plp':
      expect(page.url()).toMatch(/\/c\//)
      await expect(
        fixtures.productListingPage.productItem
          .first()
          .getByTestId('product-image')
          .first(),
      ).toBeVisible()
      break
    case 'pdp':
      expect(page.url()).toMatch(/\/p\//)
      await expect(fixtures.productDetailPage.variantPicker).toBeVisible()
      break
    case 'wishlist':
      expect(page.url()).toContain(`/${ROUTES.wishlist}`)
      await expect(
        page
          .getByTestId('wishlist-grid')
          .or(page.getByTestId('wishlist-empty-state')),
      ).toBeVisible()
      break
    case 'basket':
      expect(page.url()).toContain(`/${ROUTES.basket}`)
      if ((await page.getByTestId('basket-card').count()) > 0) {
        await expect(page.getByTestId('basket-card').first()).toBeVisible()
      } else {
        await expect(page.getByTestId('empty-state')).toBeVisible()
      }
      break
    case 'account':
      expect(page.url()).toContain(`/${CUSTOMER_ACCOUNT.routeOrders}`)
      await expect(
        page.getByTestId(
          isMobile(page) ? 'account-area-tab-0' : 'account-side-menu-item-0',
        ),
      ).toBeVisible()
      break
  }
}

/**
 * Test suite for hydration testing with non-logged-in (guest) users.
 * Tests various page types to ensure proper hydration without authentication.
 */
test.describe('Hydration Tests (non-logged-in user)', () => {
  const pagesToTest = ['homepage', 'plp', 'pdp', 'wishlist', 'basket', 'signin']

  for (const pageType of pagesToTest) {
    const pageConfig = PAGE_TYPES[pageType as keyof typeof PAGE_TYPES]

    /**
     * Verifies that a specific page type loads without hydration errors for guest users.
     *
     * This test navigates to the specified page type, monitors for hydration-related
     * console errors, reloads the page to test hydration, and verifies the main content
     * is visible after reload.
     *
     * @param page - The Playwright page object
     * @param countryDetector - Page object for country detection modal
     * @param mobileNavigation - Page object for mobile navigation
     * @param mainNavigation - Page object for main navigation
     * @param productListingPage - Page object for product listing page
     * @param productDetailPage - Page object for product detail page
     */
    test(`Verify hydration errors on ${pageConfig.name}`, async ({
      page,
      countryDetector,
      mobileNavigation,
      mainNavigation,
      productListingPage,
      productDetailPage,
      storefrontAPIClient,
    }) => {
      attachHydrationConsoleGuard(page)

      await pageConfig.navigate(page, {
        countryDetector,
        mobileNavigation,
        mainNavigation,
        productListingPage,
        productDetailPage,
        storefrontAPIClient,
      })

      await page.waitForLoadState('networkidle', { timeout: 7000 })

      await page.reload()
      await page.waitForLoadState('networkidle')

      await expect(page.getByTestId('main-content')).toBeVisible()
    })
  }
})

/**
 * Test suite for hydration testing with logged-in (authenticated) customers.
 * Tests various page types to ensure proper hydration with customer authentication.
 * Prerequisite: the test customer defined via `TEST_CUSTOMER_EMAIL6` should have items in Wishlist and Basket, so the non-empty state is tested properly.
 * Starts from the saved session of `TEST_CUSTOMER_EMAIL6` (see `tests/auth.setup.ts`).
 */
test.describe('Hydration Tests (logged-in user)', () => {
  test.use(authState('hydration'))

  const pagesToTest: LoggedInPageType[] = [
    'homepage',
    'plp',
    'pdp',
    'wishlist',
    'basket',
    'account',
  ]

  for (const pageType of pagesToTest) {
    const pageConfig = PAGE_TYPES[pageType]

    test(`Verify hydration errors on ${pageConfig.name}`, async ({
      page,
      baseURL,
      countryDetector,
      header,
      mobileNavigation,
      mainNavigation,
      productListingPage,
      productDetailPage,
      storefrontAPIClient,
    }) => {
      attachHydrationConsoleGuard(page)

      const homepageUrl = getHomepageUrl(baseURL)
      const navigationFixtures = {
        countryDetector,
        header,
        mobileNavigation,
        mainNavigation,
        productListingPage,
        productDetailPage,
        storefrontAPIClient,
      }

      await pageConfig.navigate(page, navigationFixtures)
      await countryDetector.closeModal()
      await page.waitForLoadState('networkidle', { timeout: 7000 })

      await assertLoggedInPageReady(
        pageType,
        page,
        navigationFixtures,
        homepageUrl,
      )

      await page.reload()
      await page.waitForLoadState('networkidle')

      await assertLoggedInPageReady(
        pageType,
        page,
        navigationFixtures,
        homepageUrl,
      )
    })
  }
})
