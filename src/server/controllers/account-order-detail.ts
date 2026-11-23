import { BaseAccountOrderDetailController } from '@scayle/storefront/controllers'
import type { Order } from '@scayle/storefront/types'
import type { Components, Props } from '@scayle/storefront'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'

/**
 * Order detail page controller (`GET /account/orders/:id`).
 *
 * Extends the SDK base controller for the registry-resolved `CustomerService`, the
 * order id validation, the registry-resolved `order` mapping, and the 404
 * handling. Supplies the tenant props: eager `order` and SEO `meta`.
 * Authentication is enforced by the `/account/*` auth guard middleware in
 * `ssr-routes`.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/account-and-orders/order-details
 */
export class AccountOrderDetailController extends BaseAccountOrderDetailController<'AccountOrderDetail'> {
  protected override getTemplate(_order: Order): 'AccountOrderDetail' {
    return 'AccountOrderDetail'
  }

  /**
   * Builds the SEO meta for the account order detail page head.
   *
   * @param order Order this page renders; its id goes into the title and description
   * @returns Application meta payload for the `meta` prop
   */
  protected async getMeta(order: Order): Promise<SEOMeta> {
    const shopName = await this.services.shopConfig.getShopName()

    return {
      title: withShopName(
        this.mappers.i18n,
        this.mappers.i18n.t('account.order_detail.meta.title', {
          id: order.id,
        }),
        shopName,
      ),
      description: this.mappers.i18n.t(
        'account.order_detail.meta.description',
        { id: order.id },
      ),
      robots: 'noindex, nofollow',
    }
  }

  protected override getViewProps({
    order,
  }: {
    order: Order
  }): Props<Components['AccountOrderDetail']> {
    return {
      order,
      meta: () => this.getMeta(order),
    }
  }
}
