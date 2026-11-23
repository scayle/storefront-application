import {
  CampaignsService,
  PromotionsService,
} from '@scayle/storefront/services'
import {
  Inertia,
  createSharedDataMiddleware,
  getValidAccessToken,
} from '@scayle/storefront'
import type { IncomingRequest } from '@scayle/storefront'
import { createLogger } from '@scayle/storefront/shared'

const log = createLogger('shared-data-middleware')

/**
 * Shares the session customer, segments included. A cacheable render loads no
 * session, so the customer arrives with the deferred partial reload. Every
 * other render has read the session already and sends the customer with the
 * page, so a logged-in customer's page renders its segments from first paint.
 *
 * @param request Inbound request carrying the session and the cacheability flag
 * @returns The `customer` once prop, deferred only on a cacheable render
 */
function shareCustomer(request: IncomingRequest) {
  const customer = Inertia.once(() => {
    const sessionCustomer = request.session.get('customer')
    // We need to return null here. Inertia does not include data with undefined values in the response.
    // Returning undefined would lead to the customer not being updated in the client after a logout.
    if (!sessionCustomer) {
      return null
    }

    // A session written before segment support holds a customer without
    // `segments` until the next login.
    return { ...sessionCustomer, segments: sessionCustomer.segments ?? [] }
  })

  return request.isRouteCacheable
    ? customer.defer({ group: 'customer' })
    : customer
}

// See https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/request-lifecycle
export const sharedDataMiddleware = createSharedDataMiddleware(
  ({ services, mappers, request }) => {
    return {
      // `fetchHeaderNavigation` returns `undefined` on fetch failure (already
      // logged in the SDK) and `[]` only when genuinely empty. Navigation is
      // always-present page chrome, so degrade a failed fetch to `[]` here to
      // keep the client prop non-nullable.
      navigation: Inertia.once(
        async () => (await services.navigation.fetchHeaderNavigation()) ?? [],
      ),
      footer: Inertia.once(async () => {
        const { footer, bottomFooter } =
          await services.navigation.fetchFooterNavigation()
        return { footer: footer ?? [], bottomFooter: bottomFooter ?? [] }
      }),

      promotions: Inertia.once(async () => {
        try {
          return await services.promotions.fetchActivePromotions(
            getValidAccessToken(request.session),
          )
        } catch (err) {
          // Non-critical prop: a rejected deferred prop is dropped from the
          // response and stays undefined for the page view. `[]` settles it as
          // the deal set the page renders.
          log.error({
            message: 'Failed to fetch promotions for shared prop',
            err,
          })
          return []
        }
        // TTL matches the service's own cache, so a failed fetch here
        // retries on the next visit instead of pinning [] for the session.
      }, PromotionsService.PROMOTIONS_CACHE_TTL_SECONDS).defer(),
      // No catch: `fetchActiveCampaign` does not reject when the Storefront API
      // or the cache fails, and the TTL retries a failed lookup on the next visit.
      campaign: Inertia.once(
        () => services.campaigns.fetchActiveCampaign(),
        CampaignsService.CAMPAIGN_CACHE_TTL_SECONDS,
      ),
      cmsEditorData: Inertia.once(() => services.cms.getCMSEditorData(request)),
      basket: Inertia.once(async () => {
        try {
          return await services.basket.fetchBasket(
            services.basket.getBasketKey(request.session),
          )
        } catch (err) {
          // Non-critical prop: a Storefront API failure here must not poison sibling
          // props or hang the basket UI on a skeleton. Returning null lets
          // Inertia's <Deferred> resolve out of fallback and consumers fall
          // through to the empty-basket UI.
          log.error({ message: 'Failed to fetch basket for shared prop', err })
          return null
        }
      }).defer({
        group: 'customer-data',
      }),
      wishlist: Inertia.once(async () => {
        try {
          return await services.wishlist.fetchWishlist(
            mappers.wishlist.getWishlistKey(request.session),
          )
        } catch (err) {
          log.error({
            message: 'Failed to fetch wishlist for shared prop',
            err,
          })
          return null
        }
      }).defer({
        group: 'customer-data',
      }),
      customer: shareCustomer(request),
      availableCountries: Inertia.once(() =>
        services.country.getAvailableCountries(),
      ),
      availableLanguages: Inertia.once(() =>
        services.country.getAvailableLanguages(),
      ),
      // Deferred so the user's country never lands in the initial HTML,
      // which the response cache may store and serve to the next user. The
      // deferred reload is a partial request, which the cache skips. `null`
      // rather than `undefined`, since Inertia drops `undefined` from the
      // payload and the client could not tell "nothing to suggest" from "not
      // loaded". Grouped with `customer`: the prompt needs both to decide, and
      // the default group would make detection wait on the promotions fetch.
      shopSuggestion: Inertia.once(
        () => services.country.getShopSuggestion() ?? null,
      ).defer({ group: 'customer' }),
    }
  },
)
