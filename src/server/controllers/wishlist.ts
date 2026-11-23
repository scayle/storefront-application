import { BaseWishlistController } from '@scayle/storefront/controllers'
import { buildCanonicalUrl } from '@scayle/storefront/shared'
import type { Components, Props } from '@scayle/storefront'
import type { Wishlist } from '@scayle/storefront/types'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'

/**
 * Wishlist page controller. Extends the SDK base controller for eager wishlist
 * fetch and supplies tenant-specific SEO meta.
 *
 * GET /wishlist
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/basket-and-wishlist/wishlist
 */
export class WishlistController extends BaseWishlistController<'Wishlist'> {
  protected override getTemplate(_wishlist: Wishlist): 'Wishlist' {
    return 'Wishlist'
  }

  private async getMeta(): Promise<SEOMeta> {
    const shopName = await this.services.shopConfig.getShopName()

    return {
      title: withShopName(
        this.mappers.i18n,
        this.mappers.i18n.t('wishlist_page.meta.title'),
        shopName,
      ),
      description: this.mappers.i18n.t('wishlist_page.meta.description'),
      robots: 'noindex, nofollow',
      canonicalLink: buildCanonicalUrl(this.request.url.href),
    }
  }

  protected override getViewProps(props: {
    wishlist: Wishlist
  }): Props<Components['Wishlist']> {
    return {
      wishlist: props.wishlist,
      meta: () => this.getMeta(),
    }
  }
}
