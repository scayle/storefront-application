import { BaseProductDetailController } from '@scayle/storefront/controllers'
import { Inertia, getValidAccessToken } from '@scayle/storefront'
import {
  appendImageModifiers,
  buildCanonicalUrl,
  createLogger,
} from '@scayle/storefront/shared'
import { SmartSortingKey } from '@scayle/storefront-api'
import type { Components, Props } from '@scayle/storefront'
import type {
  DetailedProduct,
  ListingProduct,
  GiftPromotion,
} from '@scayle/storefront/types'
import type { Promisable } from 'type-fest'
import type { SEOMeta } from '@shared/types/SEO'
import {
  getPromotionsForProduct,
  isFreeGiftPromotion,
} from '@shared/utils/promotion'
import { getProductJsonLd, withShopName } from '@server/utils/seo'

const log = createLogger('product-detail')

/** Default number of recommendation products fetched per slider. */
const RECOMMENDATION_LIMIT = 10

/**
 * Product detail page controller. Extends the SDK base controller for id
 * parsing, product fetch, and canonical redirect, and composes the tenant
 * Inertia prop bag: eager `product`/`meta`, server-only `hreflangs`/`jsonLd`,
 * deferred recommendations, gift promotion, customer data, and subscription
 * prices.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/browsing/product-detail-page
 */
export class ProductDetailController extends BaseProductDetailController<'ProductDetail'> {
  /**
   * Returns the Inertia page for this product.
   *
   * Override to choose a different page from product attributes (e.g. gift card
   * vs standard PDP). Always called with a resolved product after the not-found
   * guard in the base `view()`.
   *
   * @param _product Mapped detailed product for the current request
   * @returns Inertia page component name
   */
  protected override getTemplate(_product: DetailedProduct): 'ProductDetail' {
    return 'ProductDetail'
  }

  /**
   * Runs before the product is fetched. Nothing is resolved yet.
   *
   * Override to short-circuit (redirect, auth gate) before the SAPI product
   * call. Return a `Response` to stop the lifecycle, or `undefined` to continue.
   *
   * @returns Response to short-circuit, or `undefined` to continue
   */
  protected override beforeFetch(): Promisable<Response | undefined> {
    return super.beforeFetch()
  }

  /**
   * Runs after the product is resolved and before `ctx.render()`.
   *
   * Override to short-circuit from product data (e.g. hide a SKU, redirect by
   * attribute). Return a `Response` to stop the lifecycle, or `undefined` to
   * continue.
   *
   * @param data Resolved product for the current request
   * @param data.product The mapped detailed product
   * @returns Response to short-circuit, or `undefined` to continue
   */
  protected override beforeRender(data: {
    product: DetailedProduct
  }): Promisable<Response | undefined> {
    return super.beforeRender(data)
  }

  /**
   * Fetches similar-product recommendations, swallowing errors to an empty list
   * so a recommendation outage never breaks the page.
   *
   * @param productId Product id to find similar products for.
   * @param limit Maximum number of products to return.
   * @returns Mapped listing products, or an empty array on error.
   */
  protected async fetchSimilarProducts(
    productId: number,
    limit: number = RECOMMENDATION_LIMIT,
  ): Promise<ListingProduct[]> {
    try {
      return await this.services.recommendations.fetchSimilarProducts(
        productId,
        { limit },
      )
    } catch (error) {
      log.error({ message: 'Failed to fetch similar products', err: error })
      return []
    }
  }

  /**
   * Fetches trending category recommendations for the product's main category.
   * Returns an empty list when the product has no main category, and swallows
   * errors to an empty list.
   *
   * @param product The current product.
   * @param limit Maximum number of products to return.
   * @returns Mapped listing products, or an empty array when unavailable.
   */
  protected async fetchTrendingProducts(
    product: DetailedProduct,
    limit: number = RECOMMENDATION_LIMIT,
  ): Promise<ListingProduct[]> {
    if (!product.mainCategory) {
      return []
    }
    try {
      return await this.services.recommendations.fetchCategoryRecommendations(
        product.mainCategory.id,
        {
          excludeProductId: product.id,
          sortingKey: SmartSortingKey.TRENDING,
          limit,
        },
      )
    } catch (error) {
      log.error({ message: 'Failed to fetch trending products', err: error })
      return []
    }
  }

  /**
   * Builds the PDP head meta: title, description, canonical link, robots, and
   * the Open Graph image.
   *
   * @param product The product being rendered.
   * @returns SEOMeta for the `PageMetaHead` component. The title has no shop
   *   name suffix and the description is left out when the shop configuration
   *   could not be read, since the shop name sits mid-sentence.
   */
  protected async getMeta(product: DetailedProduct): Promise<SEOMeta> {
    const i18n = this.mappers.i18n
    const shopName = await this.services.shopConfig.getShopName()
    // og:image is sized on the server (there is no client to build it): append a
    // social-preview width to the first image's CDN url.
    const socialImageUrl = product.images[0]?.url

    return {
      title: withShopName(
        i18n,
        i18n.t('product_detail_page.meta.title', { productName: product.name }),
        shopName,
      ),
      description: shopName
        ? i18n.t('product_detail_page.meta.description', {
            productName: product.name,
            shopName,
          })
        : undefined,
      canonicalLink: buildCanonicalUrl(this.request.url.href),
      robots: 'index, follow',
      image: socialImageUrl
        ? appendImageModifiers(socialImageUrl, { width: 1200 })
        : undefined,
    }
  }

  protected override getViewProps({
    product,
  }: {
    product: DetailedProduct
  }): Props<Components['ProductDetail']> {
    return {
      product,

      meta: () => this.getMeta(product),

      hreflangs: Inertia.serverOnly(() => this.fetchHreflangs(product.id)),

      /** ProductGroup and BreadcrumbList for crawlers, which read only the server-rendered HTML. */
      jsonLd: Inertia.serverOnly(() =>
        getProductJsonLd(
          product,
          this.request.url.href,
          this.storefront,
          this.request.origin,
          this.mappers.i18n,
        ),
      ),

      similarProducts: Inertia.defer(
        () => this.fetchSimilarProducts(product.id),
        { group: 'recommendations' },
      ),
      trendingProducts: Inertia.defer(
        () => this.fetchTrendingProducts(product),
        { group: 'recommendations' },
      ),

      /** Resolves the free-gift promotion for this product, or null when none applies. */
      giftPromotion: Inertia.defer(
        async (): Promise<GiftPromotion | null> => {
          try {
            const promotions =
              await this.services.promotions.fetchActivePromotions()
            const productPromotions = getPromotionsForProduct(
              product.attributeValuesByGroup,
              promotions,
            )
            const giftPromotion = productPromotions.find(isFreeGiftPromotion)
            if (!giftPromotion) {
              return null
            }
            return await this.services.gifts.fetchGifts(giftPromotion)
          } catch (error) {
            log.error({ message: 'Failed to fetch gift promotion', err: error })
            return null
          }
        },
        { group: 'promotion-data' },
      ),

      /** Deferred, not eager: the cacheable full render skips the session read, so an eager token would be empty (see changeset). */
      accessToken: Inertia.defer(
        () => getValidAccessToken(this.request.session),
        { group: 'customer-data' },
      ),

      // Left out when the country has the subscription addon switched off or
      // no variant can be subscribed to, so those pages make no deferred
      // request for prices nothing renders.
      ...(this.storefront.country.publicFields?.subscriptionEnabled &&
      product.variants.some((variant) => variant.subscription)
        ? {
            /** Subscription-discounted prices for each variant, loaded deferred. */
            subscriptionPrices: Inertia.defer(
              () => this.services.subscription.fetchVariantPrices(product.id),
              { group: 'subscription' },
            ),
          }
        : {}),
    }
  }
}
