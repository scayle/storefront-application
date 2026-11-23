import { BaseController } from '@scayle/storefront/controllers'
import { getValidAccessToken } from '@scayle/storefront'
import type { Components, Props } from '@scayle/storefront'
import { getSubscriptionOrigin } from '@scayle/storefront/shared'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'

/**
 * Subscription management page controller. Mounts the SCAYLE Subscription
 * Overview web component (external IFrame).
 *
 * The page resolves no domain data of its own, so it extends
 * {@link BaseController} directly and keeps the default `view()`.
 * Authentication is enforced by the `/account/*` auth guard middleware in
 * `ssr-routes`.
 *
 * GET /account/subscriptions
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/subscriptions
 */
export class AccountSubscriptionsController extends BaseController<'AccountSubscriptions'> {
  protected override getTemplate(): 'AccountSubscriptions' {
    return 'AccountSubscriptions'
  }

  /**
   * Returns a 404 for a shop country without the subscription addon, so the
   * customer gets the not-found page rather than a web component whose
   * subscription API the shop country does not offer.
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

  protected override getViewProps(): Props<Components['AccountSubscriptions']> {
    return {
      /** OAuth access token the web component authenticates the customer with. */
      accessToken: getValidAccessToken(this.request.session),
      /** Base URL of the subscription API the web component calls. */
      apiBaseUrl: `${getSubscriptionOrigin(this.storefront.config.tenantSpace)}/storefront-api`,
      /** Head meta for the account subscriptions page. */
      meta: () => this.getMeta(),
    }
  }

  /**
   * Builds the head meta for the account subscriptions page.
   *
   * The account area is visitor-specific and does not benefit from indexing,
   * hence `noindex, nofollow`.
   *
   * @returns Head meta with the translated title, suffixed with the shop name when it can be read.
   */
  private async getMeta(): Promise<SEOMeta> {
    const shopName = await this.services.shopConfig.getShopName()

    return {
      title: withShopName(
        this.mappers.i18n,
        this.mappers.i18n.t('subscription.page.meta.title'),
        shopName,
      ),
      description: this.mappers.i18n.t('subscription.page.meta.description'),
      robots: 'noindex, nofollow',
    }
  }
}
