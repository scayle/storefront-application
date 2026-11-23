import { getValidAccessToken } from '@scayle/storefront'
import { BaseController } from '@scayle/storefront/controllers'
import {
  buildCanonicalUrl,
  getSiteRelativePath,
} from '@scayle/storefront/shared'
import type { Components, Props } from '@scayle/storefront'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'
import { routes } from '@shared/routes'

/**
 * Sign-in page controller.
 *
 * The sign-in page has no domain fetch lifecycle, so — unlike the domain page
 * controllers that extend an intermediate SDK base (product detail, basket, …)
 * — it extends {@link BaseController} directly and keeps its default `view()`,
 * which renders the template with the view props. It also builds its own head
 * meta inline instead of delegating to a shared page-meta mapper.
 *
 * GET /signin
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/account-and-orders/login-and-registration
 */
export class SignInController extends BaseController<'SignIn'> {
  protected override getTemplate(): 'SignIn' {
    return 'SignIn'
  }

  /**
   * Redirects visitors who already have a session away from the sign-in form.
   *
   * Prefers the `redirectUrl` the auth guard appended when it bounced the
   * visitor here, so an authenticated visitor lands on the page they originally
   * asked for; falls back to the account orders page, which `/account` would
   * redirect to anyway. `getSiteRelativePath` rejects anything that resolves
   * off-origin (same helper `useAuthentication` uses on the client) so an
   * attacker cannot turn `/signin` into an open redirect. `inertia.navigate`
   * localizes the target for the active country.
   *
   * @returns A 302 to the redirect target for authenticated visitors, or
   *   `undefined` to render the sign-in form for guests.
   */
  protected override beforeRender(): Response | undefined {
    if (
      !this.request.session.get('customer') ||
      !this.inertia.isMainRequest()
    ) {
      return undefined
    }

    const target =
      getSiteRelativePath(this.request.query.redirectUrl) ??
      routes.accountOrders

    return this.inertia.navigate(target, 302)
  }

  protected override getViewProps(): Props<Components['SignIn']> {
    return {
      /** Whether to render the registration form, driven by the `?register=true` query param. */
      showRegistration: this.request.query.register === 'true',
      /** OAuth access token forwarded to the checkout web component, or undefined for guests. */
      accessToken: getValidAccessToken(this.request.session),
      /** Head meta for the sign-in page. */
      meta: () => this.getMeta(),
    }
  }

  /**
   * Builds the head meta for the sign-in page.
   *
   * Sign-in is session-specific and does not benefit from indexing, hence
   * `noindex,follow`. Resolves the shop display name for the title and
   * description and derives the canonical link from the request URL.
   *
   * @returns Head meta with the translated title. The shop name suffix and the description, which
   *   names the shop, are left out when the shop configuration cannot be read.
   */
  private async getMeta(): Promise<SEOMeta> {
    const shopName = await this.services.shopConfig.getShopName()

    return {
      title: withShopName(
        this.mappers.i18n,
        this.mappers.i18n.t('sign_in_page.meta.title'),
        shopName,
      ),
      description: shopName
        ? this.mappers.i18n.t('sign_in_page.meta.description', { shopName })
        : undefined,
      robots: 'noindex,follow',
      canonicalLink: buildCanonicalUrl(this.request.url.href),
    }
  }
}
