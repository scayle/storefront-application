import { getValidAccessToken } from '@scayle/storefront'
import { BaseBasketController } from '@scayle/storefront/controllers'
import type { BasketViewData } from '@scayle/storefront/controllers'
import type { Basket, GiftPromotion } from '@scayle/storefront/types'
import type { Components, Props } from '@scayle/storefront'
import { buildCanonicalUrl, createLogger } from '@scayle/storefront/shared'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'

const log = createLogger('basket')

/**
 * Basket page controller. Extends the SDK base controller, which owns the
 * basket fetch lifecycle (registry basket service, error page on failure), and
 * supplies the tenant page props: checkout JWT and script URL, access token,
 * delivery costs, and the gift rows resolved from the basket.
 *
 * GET /basket
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/basket-and-wishlist/basket
 */
export class BasketController extends BaseBasketController<'Basket'> {
  protected override getTemplate(_basket: Basket): 'Basket' {
    return 'Basket'
  }

  /**
   * Builds the basket page head meta: the title with the shop name, `noindex,
   * nofollow`, and a canonical link that drops query parameters such as
   * `utm_source`.
   *
   * @returns SEOMeta for the `PageMetaHead` component
   */
  protected async getMeta(): Promise<SEOMeta> {
    const shopName = await this.services.shopConfig.getShopName()

    return {
      title: withShopName(
        this.mappers.i18n,
        this.mappers.i18n.t('basket_page.meta.title'),
        shopName,
      ),
      description: this.mappers.i18n.t('basket_page.meta.description'),
      robots: 'noindex, nofollow',
      canonicalLink: buildCanonicalUrl(this.request.url.href),
    }
  }

  /**
   * Resolves the Buy X Get Y gift rows for the basket page from the basket's
   * own gift promotions. The Storefront API's `applicablePromotions` is the sole
   * authority for gift eligibility, so gifts are not re-filtered against the
   * active-promotion page. Rows with no reward products are dropped: an empty
   * row renders a gift panel with nothing to choose and reports a
   * `view_product_list` no one can act on. A gift-service outage is logged and
   * renders no gift rows instead of failing the page.
   *
   * The MOV/tier/combo banners are not computed here: the client derives them
   * from the shared, customer-scoped `promotions` prop and the basket in
   * `useBasketPromotionBanners`.
   *
   * @param basket Basket this request renders
   * @returns Gift rows that have at least one reward product
   */
  private async fetchGiftPromotions(basket: Basket): Promise<GiftPromotion[]> {
    try {
      const giftPromotions = await Promise.all(
        basket.giftPromotions.map((promotion) =>
          this.services.gifts.fetchGifts(promotion),
        ),
      )

      return giftPromotions.filter(
        (giftPromotion): giftPromotion is GiftPromotion =>
          !!giftPromotion?.products.length,
      )
    } catch (err) {
      log.error({ message: 'Failed to fetch basket page gift promotions', err })
      return []
    }
  }

  protected override getViewProps({
    basket,
  }: BasketViewData): Props<Components['Basket']> {
    return {
      /**
       * The basket this page renders, overriding the shared basket prop of the
       * same name so the page reads a basket resolved for this request.
       *
       * Sent with the first response rather than deferred. `view()` has already
       * fetched the basket by the time this runs, and deferring it threw that
       * result away: the client then asked for the prop, which re-entered
       * `view()` and fetched the same basket a second time.
       */
      basket,
      /**
       * Signed JWT passed to the checkout web component. Includes the basket
       * and the campaign key that `CheckoutService` resolves on its own.
       */
      checkoutJwt: () => this.generateCheckoutJwt(),
      /** OAuth access token forwarded to the checkout web component */
      accessToken: () => getValidAccessToken(this.request.session) ?? '',
      /** Delivery cost rows, or the default copy when the shop configuration cannot be read */
      deliveryCosts: async () => {
        const shopConfig = await this.services.shopConfig.getShopConfiguration()
        return (
          shopConfig?.deliveryCost ?? this.mappers.shopConfig.mapDeliveryCost()
        )
      },
      /** Buy X Get Y gift rows unlocked by the basket */
      giftPromotions: () => this.fetchGiftPromotions(basket),
      /** Head meta for the basket page */
      meta: () => this.getMeta(),
    }
  }
}
