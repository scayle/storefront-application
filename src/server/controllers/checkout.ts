import { BaseCheckoutController } from '@scayle/storefront/controllers'
import type { Components, Props } from '@scayle/storefront'
import { buildCanonicalUrl } from '@scayle/storefront/shared'
import type { Basket } from '@scayle/storefront/types'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'

/**
 * Checkout page controller. Extends the SDK base controller, which owns the
 * registry basket fetch, redirect-to-basket error handling, and shared
 * checkout helpers (`generateCheckoutJwt`, `fetchAccessToken`), and supplies
 * the tenant prop bag: meta, shop name, checkout header, and deferred tokens.
 *
 * The page reads the basket and the signed-in customer from Inertia shared data,
 * so neither is sent as a page prop here.
 *
 * GET /checkout
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/checkout
 */
export class CheckoutController extends BaseCheckoutController<'Checkout'> {
  protected override getTemplate(_basket: Basket): 'Checkout' {
    return 'Checkout'
  }

  protected override getViewProps(): Props<Components['Checkout']> {
    return {
      /** Head meta for the checkout page */
      meta: () => this.getMeta(),
      /** Signed JWT passed to the web component, includes basket and active campaign */
      checkoutJwt: () => this.generateCheckoutJwt(),
      /** OAuth access token forwarded to the checkout web component */
      accessToken: () => this.fetchAccessToken(),
      /** Shop display name for the simple layout header, `undefined` when it cannot be read */
      shopName: () => this.services.shopConfig.getShopName(),
      /** Simplified header navigation; a failed fetch degrades to [] */
      checkoutHeader: async () =>
        (await this.services.navigation.fetchCheckoutHeaderNavigation()) ?? [],
    }
  }

  /**
   * Builds the checkout page head meta: the title with the shop name,
   * `noindex, nofollow`, and a canonical link that drops query parameters such
   * as `utm_source`.
   *
   * @returns SEOMeta for the `PageMetaHead` component
   */
  protected async getMeta(): Promise<SEOMeta> {
    const shopName = await this.services.shopConfig.getShopName()

    return {
      title: withShopName(
        this.mappers.i18n,
        this.mappers.i18n.t('checkout_page.meta.title'),
        shopName,
      ),
      description: this.mappers.i18n.t('checkout_page.meta.description'),
      robots: 'noindex, nofollow',
      canonicalLink: buildCanonicalUrl(this.request.url.href),
    }
  }
}
