import { BaseController } from '@scayle/storefront/controllers'
import type { Components, Props } from '@scayle/storefront'
import { getSubscriptionOrigin } from '@scayle/storefront/shared'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'

/**
 * Subscription cancellation page controller. Mounts the SCAYLE Subscription
 * Cancellation web component (external IFrame). This is a public page with no
 * authentication requirement.
 *
 * The page resolves no domain data of its own, so it extends
 * {@link BaseController} directly and keeps the default `view()`.
 *
 * GET /subscription-cancellation
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/subscriptions
 */
export class SubscriptionCancellationController extends BaseController<'SubscriptionCancellation'> {
  protected override getTemplate(): 'SubscriptionCancellation' {
    return 'SubscriptionCancellation'
  }

  /**
   * Returns a 404 for a shop country without the subscription addon.
   *
   * @returns The 404 page when the shop country does not set
   *   `subscriptionEnabled` in its `publicFields`, otherwise `undefined` to
   *   render the page.
   */
  protected override beforeRender() {
    if (!this.storefront.country.publicFields?.subscriptionEnabled) {
      return this.ctx.notFound()
    }
  }

  protected override getViewProps(): Props<
    Components['SubscriptionCancellation']
  > {
    return {
      /** Base URL of the subscription API the web component calls. */
      apiBaseUrl: `${getSubscriptionOrigin(this.storefront.config.tenantSpace)}/storefront-api`,
      /** Head meta for the subscription cancellation page. */
      meta: () => this.getMeta(),
    }
  }

  /**
   * Builds the head meta for the subscription cancellation page.
   *
   * The page is tied to one visitor's subscription and does not benefit from
   * indexing, hence `noindex, nofollow`.
   *
   * @returns Head meta with the translated title, suffixed with the shop name when it can be read.
   */
  private async getMeta(): Promise<SEOMeta> {
    const shopName = await this.services.shopConfig.getShopName()

    return {
      title: withShopName(
        this.mappers.i18n,
        this.mappers.i18n.t('subscription.cancellation.meta.title'),
        shopName,
      ),
      description: this.mappers.i18n.t(
        'subscription.cancellation.meta.description',
      ),
      robots: 'noindex, nofollow',
    }
  }
}
