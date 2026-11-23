import { usePage } from '@client/composables/usePage'
import type { ComputedRef } from 'vue'
import { computed, reactive } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import type { Wishlist } from '@scayle/storefront/types'
import { partialReload } from '@client/utils/router'
import type { ReloadError } from '@client/utils/router'
import { useRpcClient } from './useRpcClient'
import { useToast } from './useToast'

/**
 * Coalesces concurrent `toggleItem` calls for the same product id across
 * every `SFWishlistToggle` instance. Without this, a product rendered by
 * multiple toggles at once (e.g. a promotion modal over the PDP) could
 * fire two oRPC toggles and two tracking events for one logical intent.
 *
 * Reactive so every mounted `SFWishlistToggle` for the same product reflects
 * the in-flight state (disabled, aria-busy) and not only the instance that
 * initiated the toggle.
 *
 * `createSharedComposable` gives every server-side call its own map, so a
 * server render never shares it with another request. In the browser the map
 * lives while any caller is mounted, and each entry deletes itself when its
 * toggle settles.
 */
const useInFlightToggles = createSharedComposable(() =>
  reactive(new Map<number, Promise<{ added: boolean; error?: unknown }>>()),
)

interface UseWishlistReturn {
  /**
   * The wishlist data. `undefined` while the deferred prop resolves, `null` when
   * the fetch failed.
   */
  wishlist: ComputedRef<Wishlist | null | undefined>
  /**
   * The number of items in the wishlist.
   */
  count: ComputedRef<number>
  /**
   * Returns whether any wishlist item matches the given product ID.
   *
   * @param productId - The product ID to search for.
   * @returns `true` when at least one item matches, `false` otherwise.
   */
  hasProductInWishlist: (productId: number) => boolean
  /**
   * Returns whether a toggle for the given product id is currently in flight.
   * Every mounted toggle for that product sees the same value.
   *
   * @param productId - The product ID to check.
   * @returns `true` when a toggle is running, `false` otherwise.
   */
  isProductToggling: (productId: number) => boolean
  /**
   * Toggles a product in the wishlist (adds if absent, removes if present)
   * and reloads the shared wishlist prop so every consumer updates.
   * Concurrent calls for the same product id return the same promise so
   * duplicate toggles and duplicate tracking events cannot fire.
   * A failed toggle shows an error toast. A failed wishlist reload shows the
   * global error toast instead.
   *
   * @param productId - The product ID to toggle.
   * @returns Object with `added` (true when the product is now in the wishlist,
   *   false when it was removed) and `error` (set only when the oRPC mutation
   *   failed, and callers skip tracking in that case).
   */
  toggleItem: (
    productId: number,
  ) => Promise<{ added: boolean; error?: unknown }>
  /**
   * Reloads the wishlist data from the server.
   *
   * @returns A promise that resolves when the wishlist is reloaded.
   */
  reloadWishlist: () => Promise<{ error?: ReloadError }>
}

/**
 * Provides access to the shared wishlist state and exposes methods to toggle items.
 *
 * The wishlist is loaded as a deferred prop in the `customer-data` group alongside
 * the basket. Until it resolves, `wishlist` is `undefined` and `count` is `0`.
 *
 * @example
 * ```ts
 * const { count, hasProductInWishlist, toggleItem } = useWishlist()
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/basket-and-wishlist/wishlist
 */
export function useWishlist(): UseWishlistReturn {
  const page = usePage()
  const rpcClient = useRpcClient()
  const { show } = useToast()
  const { t } = useI18n()
  const inFlightToggles = useInFlightToggles()

  const wishlist = computed(() => page.props.wishlist)
  const items = computed(() => wishlist.value?.items ?? [])
  const count = computed(() => items.value.length)

  // Deliberately group-agnostic, matching `toggleItem` below: the Storefront Application
  // never sends an `itemGroup`, so every line it creates is ungrouped. If you
  // add grouped wishlist lines, scope both by group id, otherwise a grouped line
  // fills the heart while the toggle adds a second ungrouped line.
  const hasProductInWishlist = (productId: number) =>
    items.value.some((item) => item.productId === productId)

  const isProductToggling = (productId: number) =>
    inFlightToggles.has(productId)

  const reloadWishlist = () => partialReload(['wishlist'])

  const toggleItem = (
    productId: number,
  ): Promise<{ added: boolean; error?: unknown }> => {
    const existing = inFlightToggles.get(productId)
    if (existing) {
      return existing
    }

    const promise = (async () => {
      const { data, error } = await rpcClient.wishlist.toggle({ productId })

      const { error: reloadError } = await reloadWishlist()

      const toggleFailed = !!error || data?.success === false

      // A failed reload already showed the global error toast.
      if (toggleFailed && !reloadError) {
        show(t('wishlist_page.notification.toggle_error'), { type: 'ERROR' })
      }

      if (toggleFailed) {
        return {
          added: false,
          error:
            error ??
            new Error(data && !data.success ? data.error : 'toggle failed'),
        }
      }

      return { added: data?.success === true && data.action === 'added' }
    })().finally(() => {
      inFlightToggles.delete(productId)
    })

    inFlightToggles.set(productId, promise)
    return promise
  }

  return {
    wishlist,
    count,
    hasProductInWishlist,
    isProductToggling,
    toggleItem,
    reloadWishlist,
  }
}
