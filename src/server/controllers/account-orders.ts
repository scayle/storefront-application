import { BaseAccountOrdersController } from '@scayle/storefront/controllers'
import type { OrderSummary } from '@scayle/storefront/types'
import type { Components, Props } from '@scayle/storefront'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'

/**
 * Order history page controller (`GET /account/orders`).
 *
 * Extends the SDK base controller for the registry-resolved `CustomerService` and
 * lifecycle, and supplies the tenant props: eager SEO `meta` and the eager
 * `orderSummaries` (client-side paginated). Authentication is enforced by the
 * `/account/*` auth guard middleware in `ssr-routes`.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/account-and-orders/order-history
 */
export class AccountOrdersController extends BaseAccountOrdersController<'AccountOrders'> {
  protected override getTemplate(
    _orderSummaries: OrderSummary[],
  ): 'AccountOrders' {
    return 'AccountOrders'
  }

  /**
   * Builds the SEO meta for the account order page head.
   *
   * @returns Application meta payload for the `meta` prop
   */
  protected async getMeta(): Promise<SEOMeta> {
    const shopName = await this.services.shopConfig.getShopName()

    return {
      title: withShopName(
        this.mappers.i18n,
        this.mappers.i18n.t('account.orders.meta.title'),
        shopName,
      ),
      robots: 'noindex, nofollow',
    }
  }

  protected override getViewProps({
    orderSummaries,
  }: {
    orderSummaries: OrderSummary[]
  }): Props<Components['AccountOrders']> {
    return {
      meta: () => this.getMeta(),
      orderSummaries,
    }
  }
}
