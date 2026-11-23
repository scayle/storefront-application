import { ref, shallowReadonly, shallowRef } from 'vue'
import type { Ref, ShallowRef } from 'vue'
import type { BasketItem } from '@scayle/storefront/types'

interface UseAddToBasketSlideInReturn {
  /** Whether the confirmation slide-in is currently open. */
  isOpen: Ref<boolean>
  /**
   * The basket line the confirmation is showing, or `null` when the slide-in
   * has never been opened. Kept while closing so the panel does not go blank
   * mid-transition.
   */
  addedItem: Readonly<ShallowRef<BasketItem | null>>
  /** Opens the slide-in for the given basket line. */
  open: (item: BasketItem) => void
  /** Closes the slide-in. */
  close: () => void
}

// Module-level singleton: `addItem` opens the slide-in from `useBasket`, while
// the panel itself is mounted once in the layout, so both sides need the same
// state without a prop chain between them.
//
// INVARIANT — client-only: module scope means this state is shared across every
// request an SSR Node process handles. Only ever write to these refs from a
// client-side event handler (an add, a close, a page's `onMounted`), never
// during a server render, or one visitor's slide-in bleeds into another's HTML.
const isOpen = ref(false)
// `shallowRef`: holds plain server data that is replaced wholesale, never
// mutated field by field, so a deep reactive proxy would cost traversal of every
// basket line for nothing.
const addedItem = shallowRef<BasketItem | null>(null)

/**
 * Holds the state of the add-to-basket confirmation slide-in: whether it is
 * open and the basket line it confirms.
 *
 * Used by `useBasket().addItem` to open the panel on a successful add, and by
 * `SFAddToBasketSlideIn` to render it. The panel sources its recommendations
 * from the current page's props, so they are not held here.
 *
 * @returns The slide-in state plus `open` and `close`.
 *
 * @example
 * ```ts
 * const { isOpen, addedItem, close } = useAddToBasketSlideIn()
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/basket-and-wishlist/basket
 */
export function useAddToBasketSlideIn(): UseAddToBasketSlideInReturn {
  const open = (item: BasketItem) => {
    // Enforces the module-scope invariant above: a server-render write would
    // outlive the request and surface in the next visitor's HTML.
    if (import.meta.env.SSR) {
      return
    }

    addedItem.value = item
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
  }

  return {
    isOpen,
    addedItem: shallowReadonly(addedItem),
    open,
    close,
  }
}
