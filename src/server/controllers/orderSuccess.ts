import { BaseOrderSuccessController } from '@scayle/storefront/controllers'
import type { OrderSuccessViewData } from '@scayle/storefront/controllers'
import type { Components, Props } from '@scayle/storefront'
import type { Order } from '@scayle/storefront/types'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'

/**
 * Order success page controller. Extends the SDK base controller, which owns
 * the CBD token validation, registry order fetch, and empty-state fallback,
 * and supplies the tenant page meta.
 *
 * GET /success?cbd=<token>
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/checkout/order-confirmation
 */
export class OrderSuccessController extends BaseOrderSuccessController<'OrderSuccess'> {
  protected override getTemplate(_order: Order | undefined): 'OrderSuccess' {
    return 'OrderSuccess'
  }

  /**
   * Builds the head meta for the order success page, with separate copy for
   * the empty state when the CBD token did not resolve to an order.
   *
   * @param order Confirmed order, or `undefined` when the CBD token did not
   *   resolve to one
   * @returns Localized noindex meta, with the shop name in the title when it can be read
   */
  private async getMeta(order: Order | undefined): Promise<SEOMeta> {
    const shopName = await this.services.shopConfig.getShopName()

    return {
      title: withShopName(
        this.mappers.i18n,
        order
          ? this.mappers.i18n.t('order_success_page.meta.title')
          : this.mappers.i18n.t('order_success_page.no_order_found.meta.title'),
        shopName,
      ),
      description: order
        ? this.mappers.i18n.t('order_success_page.meta.description')
        : this.mappers.i18n.t('order_success_page.no_order_found.description'),
      robots: 'noindex, nofollow',
    }
  }

  protected override getViewProps({
    order,
  }: OrderSuccessViewData): Props<Components['OrderSuccess']> {
    return {
      order,
      /** Head meta for the order success page */
      meta: () => this.getMeta(order),
    }
  }
}
