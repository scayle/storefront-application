import { ref, watch } from 'vue'
import type { Campaign, Promotion } from '@scayle/storefront/types'
import { useRoute } from '@client/composables/useRoute'
import type { PromotionPlacement } from '@client/utils/promotion'
import { usePromotionEvents } from './usePromotionEvents'

interface UseDealTrackingReturn {
  /**
   * Visibility-directive callback. Fires the impression event the first time
   * the deal becomes visible after the most recent reset, held back while the
   * surface cannot report a placement.
   */
  onVisible: (visible: boolean) => void
  /**
   * Click handler. Fires the selection event when the deal carries a link.
   */
  onSelect: () => void
}

/**
 * Checks if a deal is a promotion.
 *
 * @param deal The deal to check.
 * @returns True if the deal is a promotion, false otherwise.
 */
const isPromotion = (deal: Promotion | Campaign): deal is Promotion =>
  'priority' in deal

/**
 * Tracks impressions and clicks for a deal banner or ribbon.
 *
 * Owns the once-per-page-view impression guard and resets it on two
 * triggers: when the wrapped `deal` reference changes (the persistent
 * layout swaps to a different promotion) and when the page path changes
 * (a fresh impression should fire on the next page even when the same
 * component instance stays mounted. A ribbon that stayed in view across the
 * navigation only re-reports once it leaves and re-enters the viewport, as
 * the visibility directive fires on that change). Partial reloads, pagination
 * and filter changes keep the path and do not re-arm the guard, so a page
 * that loads its deferred props emits one impression. The composable branches
 * internally between the four `usePromotionEvents` helpers based on whether the
 * deal is a `Promotion` or a `Campaign`. Each helper fires the GA4 event and
 * the SCAYLE Analytics event together, so the impression guard covers both.
 *
 * A surface whose deal set comes from a deferred prop reports `undefined` for
 * the placement until that prop resolves (see `getDealPlacement`). It then
 * holds the impression rather than sending a provisional total: the PDP
 * renders its campaign banner in the initial HTML while `promotions` is still
 * loading, and `useVisibilityTracking` fires only on an intersection change,
 * so a banner that never leaves the viewport would otherwise report the set
 * size it saw first and never correct it. The held impression is sent as soon
 * as the placement resolves, without waiting for a new intersection. A
 * placement that only changes from one resolved value to another does not
 * report, so after a page change a deal reports on its next intersection.
 *
 * @param getDeal Reactive getter for the deal currently shown by the surface.
 * @param getPlacement Reactive getter for the component type and position the
 *   surface renders the deal at, sent with the SCAYLE Analytics events.
 *   `undefined` while the surface does not know its deal set yet.
 * @returns `onVisible` for the visibility directive and `onSelect` for the click handler.
 *
 * @example
 * ```ts
 * const { deal, placement } = defineProps<{
 *   deal: Promotion | Campaign
 *   placement: PromotionPlacement | undefined
 * }>()
 *
 * const { onVisible, onSelect } = useDealTracking(
 *   () => deal,
 *   () => placement,
 * )
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/google-tag-manager/tracking-events
 */
export function useDealTracking(
  getDeal: () => Promotion | Campaign,
  getPlacement: () => PromotionPlacement | undefined,
): UseDealTrackingReturn {
  const {
    trackViewPromotion,
    trackSelectPromotion,
    trackViewCampaign,
    trackSelectCampaign,
  } = usePromotionEvents()

  const { path } = useRoute()
  const hasFiredImpression = ref(false)

  watch([getDeal, path], () => {
    hasFiredImpression.value = false
  })

  let isVisible = false

  const fireImpression = () => {
    const placement = getPlacement()
    if (!isVisible || !placement || hasFiredImpression.value) {
      return
    }
    // The guard is spent on the GA4 push. The SCAYLE dispatcher holds events
    // only while the CMP is still loading; once it has reported without
    // consent, an impression is dropped and not retried on that page view.
    hasFiredImpression.value = true

    const deal = getDeal()
    if (isPromotion(deal)) {
      trackViewPromotion(deal, placement)
    } else {
      trackViewCampaign(deal, placement)
    }
  }

  // The placement resolving is the second trigger for an impression. A banner
  // already in view when its deferred deal set lands sees no further
  // intersection change, so the held impression has to fire off the placement.
  // Only the `undefined` to resolved transition counts: surfaces rebuild their
  // placement object on every prop update, and a closing panel keeps its
  // banners in view until its exit transition ends.
  // Synchronous so it lands on the same tick as the prop update, like the
  // visibility path.
  watch(
    getPlacement,
    (_placement, previousPlacement) => {
      if (!previousPlacement) {
        fireImpression()
      }
    },
    { flush: 'sync' },
  )

  const onVisible = (visible: boolean) => {
    isVisible = visible
    if (visible) {
      fireImpression()
    }
  }

  const onSelect = () => {
    const deal = getDeal()
    const placement = getPlacement()
    // A click on a surface that has not resolved its deal set cannot report a
    // position. Only reachable in the window between hydration and a deferred
    // prop landing, where the deal set is one eager campaign banner.
    if (!deal.link || !placement) {
      return
    }
    if (isPromotion(deal)) {
      trackSelectPromotion(deal, placement)
    } else {
      trackSelectCampaign(deal, placement)
    }
  }

  return { onVisible, onSelect }
}
