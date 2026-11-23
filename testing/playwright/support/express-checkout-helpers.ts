import type { Product, Variant } from '@scayle/storefront-api'
import type { BasketPage } from '../page-objects/basketPage'
import type { StorefrontAPIClient } from './storefrontAPIClient'
import { isProductSellableNow, isVariantBuyableNow } from './productTestHelpers'

/**
 * Returns true when an environment flag is set to `true` or `1`.
 *
 * @param value - Raw environment variable value.
 */
export function isE2eFeatureEnabled(value: string | undefined): boolean {
  if (!value) {
    return false
  }

  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1'
}

/**
 * Finds the first sellable product with a buyable variant for basket setup.
 */
export async function findBuyableProductVariant(
  storefrontAPIClient: StorefrontAPIClient,
): Promise<{ product: Product; variant: Variant } | undefined> {
  const product = await storefrontAPIClient.findProduct(
    (candidate) =>
      isProductSellableNow(candidate) &&
      (candidate.variants?.some(isVariantBuyableNow) ?? false),
  )

  if (!product) {
    return undefined
  }

  const variant = product.variants?.find(isVariantBuyableNow)
  if (!variant) {
    return undefined
  }

  return { product, variant }
}

/**
 * Adds the first buyable variant from the catalog to the basket via oRPC.
 *
 * @returns Product and variant used for the basket line, or undefined when none found.
 */
export async function seedBasketWithBuyableProduct(
  storefrontAPIClient: StorefrontAPIClient,
  basketPage: BasketPage,
): Promise<{ product: Product; variant: Variant } | undefined> {
  const match = await findBuyableProductVariant(storefrontAPIClient)
  if (!match) {
    return undefined
  }

  await basketPage.addProductToBasket(match.variant.id, 1)
  return match
}
