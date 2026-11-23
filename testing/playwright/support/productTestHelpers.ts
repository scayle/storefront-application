import type { Page } from '@playwright/test'
import type { Product, Variant } from '@scayle/storefront-api'
import { test } from '../fixtures/fixtures'
import type { CountryDetector } from '../page-objects/components/countryDetector'
import type { ProductDetailPage } from '../page-objects/productDetailPage'
import { ROUTES } from './constants'

/**
 * Reads the brand attribute label from a Storefront API product.
 * Brand is single-select in the test catalog; multi-select falls back to the first value.
 *
 * @param product Product whose attributes may include `brand`.
 * @returns Brand label when present, otherwise `undefined`.
 */
export function getProductBrandLabel(product: Product): string | undefined {
  const values = product.attributes?.brand?.values
  if (values == null) {
    return undefined
  }
  if (Array.isArray(values)) {
    return values[0]?.label
  }
  return values.label
}

/**
 * Checks whether a product is sellable at the current moment.
 * Excludes products that are not active, sold out, not yet sellable, or no longer sellable.
 *
 * @param product Product to validate
 * @returns True when product is currently sellable
 */
export const isProductSellableNow = (product: Product): boolean => {
  if (!product.isActive || product.isSoldOut) {
    return false
  }

  const now = new Date()
  const sellableFrom = product.sellableTimeframe?.sellableFrom
    ? new Date(product.sellableTimeframe.sellableFrom)
    : undefined
  const sellableTo = product.sellableTimeframe?.sellableTo
    ? new Date(product.sellableTimeframe.sellableTo)
    : undefined

  if (sellableFrom && sellableFrom > now) {
    return false
  }

  if (sellableTo && sellableTo < now) {
    return false
  }

  return true
}

/**
 * Checks whether a variant can currently be purchased.
 * Accepts in-stock variants and variants explicitly sellable without stock.
 *
 * @param variant Variant to validate
 * @returns True when variant can currently be purchased
 */
export const isVariantBuyableNow = (variant: Variant): boolean => {
  return (
    variant.stock.quantity > 0 || variant.stock.isSellableWithoutStock === true
  )
}

/**
 * Checks whether a variant is out of stock in the sense of no units available and not
 * oversellable. Excludes variants that are `isSellableWithoutStock` with zero quantity,
 * which are still buyable and are not the same as a sold-out size on the PDP.
 *
 * @param variant Variant to validate
 * @returns True when quantity is zero and the variant is not sellable without stock
 */
export const isVariantOutOfStock = (variant: Variant): boolean => {
  return (
    variant.stock.quantity === 0 &&
    variant.stock.isSellableWithoutStock !== true
  )
}

/**
 * Skips the current test for a known catalog data gap, logging a warning and a
 * `catalog-gap` annotation so CI can distinguish expected skips from silent ones.
 *
 * @param caseId TestRail / case id prefix for the log line (e.g. `C2140718`).
 * @param missing When true, the required catalog data is absent and the test skips.
 * @param reason Human-readable catalog requirement that was not met.
 */
export function skipForCatalogGap(
  caseId: string,
  missing: boolean,
  reason: string,
): void {
  if (!missing) {
    return
  }

  console.warn(`[${caseId}] ${reason}`)
  test.info().annotations.push({ type: 'catalog-gap', description: reason })
  test.skip(true, reason)
}

/**
 * Fixtures required to open a product detail page and dismiss the country detector.
 */
export interface ProductDetailTestSetup {
  page: Page
  productDetailPage: ProductDetailPage
  countryDetector: CountryDetector
  /**
   * Optional path to open, relative to the country-scoped `baseURL`. Defaults to
   * `p/p-${product.id}`.
   * Pass a custom path for `?variantId=` deep links.
   */
  path?: string
}

/**
 * Sets up a product detail test: skips if no product was found, navigates to
 * its detail page, and dismisses the country detector modal.
 *
 * @param productData - Product from `storefrontAPIClient.findProduct`, or `undefined` when none matched.
 * @param skipMessage - Reason reported when the test is skipped for a missing product.
 * @param setup - Page objects used for navigation and modal dismissal; optional `path` override.
 * @returns The same product after setup (narrowed to non-null).
 */
export async function setupProductDetailTest(
  productData: Product | undefined,
  skipMessage: string,
  { page, productDetailPage, countryDetector, path }: ProductDetailTestSetup,
): Promise<Product> {
  test.skip(!productData, skipMessage)

  const productPath = path ?? `p/p-${productData!.id}`

  await productDetailPage.navigate(page, productPath, 'networkidle')
  await page.waitForLoadState('domcontentloaded')
  await page.keyboard.press('Escape')
  await countryDetector.closeModal()

  return productData!
}
