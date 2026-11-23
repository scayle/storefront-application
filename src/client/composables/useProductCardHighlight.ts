import type { ComputedRef, CSSProperties, MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import { useMounted } from '@vueuse/core'
import type { ListingProduct, Promotion } from '@scayle/storefront/types'
import { usePage } from '@client/composables/usePage'
import type { ProductCardHighlightOverride } from '@client/components/product/productCardHighlight'
import { getPromotionsForProduct } from '@shared/utils/promotion'

/** Highlight values of a product card, resolved by `useProductCardHighlight`. */
export interface ProductCardHighlight {
  /** Background color of the border, the footer bar and the deal badge. */
  backgroundColor: string | undefined
  /** Text color of the footer bar and the deal badge. */
  color: string | undefined
  /** Deal badge label. Without one, the badge shows the default "Deal" label. */
  badgeLabel: string | undefined
  /** Hides the deal badge when there is no `badgeLabel`, instead of showing "Deal". */
  hideDefaultBadge: boolean
  /** End date of the countdown in the footer bar. `undefined` shows no countdown. */
  countdownEndDate: string | undefined
  /** Whether the card shows the footer bar. */
  footerVisible: boolean
}

/** Return shape of `useProductCardHighlight`. */
export interface UseProductCardHighlightReturn {
  /**
   * Page promotions that apply to the product. Empty until the component
   * mounts and the deferred `promotions` page prop has arrived.
   */
  promotions: ComputedRef<Promotion[]>
  /** Resolved highlight values, or `undefined` for a plain card. */
  activeHighlight: ComputedRef<ProductCardHighlight | undefined>
  /** Whether the card is highlighted. The deal badge then replaces the other badges. */
  isHighlightActive: ComputedRef<boolean>
  /** Whether the card shows the footer bar. */
  isHighlightFooterVisible: ComputedRef<boolean>
  /** Colors of the deal badge, or `undefined` for a plain card. */
  highlightBadgeStyle: ComputedRef<
    Pick<CSSProperties, 'backgroundColor' | 'color'> | undefined
  >
}

/**
 * Resolves the highlighted-deal treatment of a product card: the colored
 * border, the deal badge, and the footer bar with its optional countdown.
 *
 * A direct `highlightOverride` (the CMS Single Product spotlight) wins. Without
 * one, the first page promotion that applies to the product and opts into
 * `highlightProductCards` drives the highlight. With neither, the card renders
 * as a plain tile.
 *
 * Call it from a component's `setup()`. Promotions are revealed only after the
 * component mounts, and `useMounted()` needs the component instance to notice
 * that. Called anywhere else, the promotion path never turns on.
 *
 * @param product Product the card renders. Its attribute values decide which
 * page promotions apply to it. Pass a getter or a ref: a plain value is read
 * once, so a later change of the prop would not reach the highlight.
 * @param highlightOverride Direct highlight values that take precedence over
 * page promotions, or `undefined` to derive the highlight from them. Pass a
 * getter or a ref, like `product`.
 * @returns The promotions that apply to the product, the resolved highlight,
 * and the highlight flags and badge colors the card template reads. All of
 * them stay empty or `false` until the component mounts.
 *
 * @example
 * ```ts
 * const { promotions, isHighlightActive, highlightBadgeStyle } =
 *   useProductCardHighlight(
 *     () => product,
 *     () => highlightOverride,
 *   )
 * ```
 */
export function useProductCardHighlight(
  product: MaybeRefOrGetter<ListingProduct>,
  highlightOverride: MaybeRefOrGetter<ProductCardHighlightOverride | undefined>,
): UseProductCardHighlightReturn {
  const page = usePage()
  const isMounted = useMounted()

  // `promotions` is a deferred Inertia shared prop, so it is absent during SSR and
  // the server renders no promotion badges/highlight. Inside a `<Suspense>` subtree
  // (e.g. the async CMS product sliders) client hydration is postponed until after
  // the deferred prop resolves, so reading it directly would make the first client
  // render disagree with the server HTML, a hydration mismatch. Gating on
  // `isMounted` forces the initial client render to match SSR (empty), then reveals
  // the promotion-derived UI once the component is mounted and the prop has landed.
  const promotions = computed(() =>
    isMounted.value
      ? getPromotionsForProduct(
          toValue(product).attributeValuesByGroup,
          page.props.promotions,
        )
      : [],
  )

  // Every other highlight value derives from this one, so the override-first
  // rule lives in one place.
  const activeHighlight = computed<ProductCardHighlight | undefined>(() => {
    const override = toValue(highlightOverride)
    if (override) {
      return {
        backgroundColor: override.color?.backgroundColor,
        color: override.color?.color,
        badgeLabel: override.badgeLabel,
        // Colors alone produce a border-only highlight. The default "Deal" badge
        // shows only when the override sets an explicit label.
        hideDefaultBadge: !override.badgeLabel,
        countdownEndDate: override.countdownEndDate,
        // A CMS override renders the footer only to host a countdown.
        footerVisible: !!override.countdownEndDate,
      }
    }

    const promotion = promotions.value.find((p) => p.highlightProductCards)
    if (!promotion) {
      return undefined
    }

    return {
      backgroundColor: promotion.color.backgroundColor,
      color: promotion.color.color,
      badgeLabel: promotion.product?.badgeLabel,
      hideDefaultBadge: false,
      // A highlighted promotion always shows the footer bar (matching PLP/slider
      // tiles). The countdown timer inside it is gated on `hideCountdown`.
      countdownEndDate: promotion.hideCountdown
        ? undefined
        : promotion.schedule.to,
      footerVisible: true,
    }
  })

  const isHighlightActive = computed(() => !!activeHighlight.value)

  const isHighlightFooterVisible = computed(
    () => activeHighlight.value?.footerVisible ?? false,
  )

  const highlightBadgeStyle = computed(() =>
    activeHighlight.value
      ? {
          backgroundColor: activeHighlight.value.backgroundColor,
          color: activeHighlight.value.color,
        }
      : undefined,
  )

  return {
    promotions,
    activeHighlight,
    isHighlightActive,
    isHighlightFooterVisible,
    highlightBadgeStyle,
  }
}
