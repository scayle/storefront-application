import { BaseController } from '@scayle/storefront/controllers'
import type { Components, Props } from '@scayle/storefront'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'

/**
 * Profile page controller.
 *
 * The page resolves no domain data of its own — it renders the deferred `customer`
 * shared prop — so it extends {@link BaseController} directly and keeps the
 * default `view()`. Authentication is enforced by the `/account/*` auth guard
 * middleware in `ssr-routes`.
 *
 * GET /account/profile
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/account-and-orders/account
 */
export class AccountProfileController extends BaseController<'AccountProfile'> {
  protected override getTemplate(): 'AccountProfile' {
    return 'AccountProfile'
  }

  protected override getViewProps(): Props<Components['AccountProfile']> {
    return {
      /** Head meta for the account profile page. */
      meta: () => this.getMeta(),
    }
  }

  /**
   * Builds the head meta for the account profile page.
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
        this.mappers.i18n.t('account.profile.meta.title'),
        shopName,
      ),
      robots: 'noindex, nofollow',
    }
  }
}
