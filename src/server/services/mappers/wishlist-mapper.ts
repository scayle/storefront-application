import type { WishlistWith } from '@scayle/storefront-api'
import type {
  StorefrontContext,
  StorefrontSession,
  MapperRegistry,
} from '@scayle/storefront'
import { generateKey } from '@scayle/storefront'
import { WishlistMapper } from '@scayle/storefront/mappers'

/**
 * Maps Storefront API wishlists to the application `Wishlist` type.
 *
 * Extends the tenant-invariant base {@link WishlistMapper} and implements
 * `getWishlistKey`, which derives the wishlist key from the session. Product
 * shaping is delegated to the injected product mapper (`mappers.product`).
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/extending-sdk
 */
export class WishlistMapperService extends WishlistMapper {
  // Pass-through constructor: this is the tenant extension point for wishlist
  // mapping. Keep it even though it currently forwards to the base class
  // unchanged, so a tenant customizing this mapper has a constructor to add
  // logic to instead of writing a new subclass.
  constructor(
    storefront: StorefrontContext,
    mappers: Pick<MapperRegistry, 'product'>,
  ) {
    super(storefront, mappers)
  }

  /**
   * Storefront API `with` selection for wishlist reads and mutations. Uses the
   * listing product includes, so wishlist and listing pages request the same
   * product shape.
   */
  public override get Includes(): WishlistWith {
    return {
      items: {
        product: this.mappers.product.Includes,
      },
    }
  }

  /**
   * Derives the wishlist key for the current session and shop.
   *
   * @param session Current storefront session.
   * @returns Stable wishlist key for the visitor.
   */
  public getWishlistKey<Customer extends { id: number } = { id: number }>(
    session: StorefrontSession<Customer>,
  ): string {
    return generateKey<string>({
      sessionId: session.id,
      shopId: this.context.country.shopCountryId,
      userId: session.get('customer')?.id.toString(),
    })
  }
}
