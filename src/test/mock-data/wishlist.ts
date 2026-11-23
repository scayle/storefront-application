import type { Wishlist, WishlistItem } from '@scayle/storefront/types'
import { createMockListingProduct } from './products'

/**
 * Creates a mock `WishlistItem` holding the product from
 * `createMockListingProduct`.
 *
 * @param overrides Wishlist item fields merged over the defaults.
 * @returns A complete wishlist item.
 */
export function createMockWishlistItem(
  overrides: Partial<WishlistItem> = {},
): WishlistItem {
  const product = overrides.product ?? createMockListingProduct()
  return {
    key: 'wishlist-item-1',
    productId: product.id,
    product,
    customData: {},
    ...overrides,
  }
}

/**
 * Creates a mock `Wishlist` holding one {@link createMockWishlistItem}.
 *
 * @param overrides Wishlist fields merged over the defaults.
 * @returns A complete wishlist.
 */
export function createMockWishlist(
  overrides: Partial<Wishlist> = {},
): Wishlist {
  return {
    items: [createMockWishlistItem()],
    ...overrides,
  }
}
