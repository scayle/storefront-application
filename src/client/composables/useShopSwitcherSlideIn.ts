import { createSharedComposable } from '@vueuse/core'
import { useOverlay } from '@client/composables/useOverlay'

/**
 * Returns the shop switcher slide-in, shared by every `SFShopSwitcher` trigger.
 *
 * The header and the mobile sidebar each render a trigger. Sharing one overlay
 * means both open the same dialog, which is created on the first open and kept
 * while any trigger is mounted.
 *
 * @returns The overlay controls (`open`, `isOpen`, `triggerAttrs`, ...).
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/routing
 */
export const useShopSwitcherSlideIn = createSharedComposable(() =>
  useOverlay().create(
    () => import('@client/components/shopSwitcher/SFShopSwitcherSlideIn.vue'),
  ),
)
