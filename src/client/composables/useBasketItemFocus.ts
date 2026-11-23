import { toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { BasketItem } from '@scayle/storefront/types'

/**
 * The focus targets a basket card exposes to the basket page through
 * `defineExpose`.
 */
export interface BasketCardFocusTarget {
  /** Moves keyboard focus to the card's remove button. */
  focus: () => void
  /**
   * Moves keyboard focus to the card's size selector. Returns whether the
   * selector took focus, which it cannot on a line that renders none.
   */
  focusVariantSelector: () => boolean
}

interface UseBasketItemFocusReturn {
  /**
   * Function ref for each rendered basket card. Bind it as
   * `:ref="(el) => setCardRef(item.key, el)"`: Vue calls it with the card on
   * mount and with `null` on unmount.
   */
  setCardRef: (key: string, el: unknown) => void
  /**
   * Moves keyboard focus to a sensible target after a basket line is removed.
   * The removed item's remove button no longer exists, so focus is placed on
   * the card now occupying its slot (or the new last one) via the card's
   * exposed `focus()`. When the basket empties, focuses the first link or
   * button of the empty basket state.
   *
   * @param removedIndex The position the removed line held in the rendered items.
   */
  restoreFocusAfterRemoval: (removedIndex: number) => void
  /**
   * Moves keyboard focus back to the size selector after a successful size
   * change. The change is an add of the target variant followed by a remove of
   * the old line, so the card holding the picker the customer just used is
   * unmounted and the line that replaces it carries a different key. The
   * basket service names that line, so only its card has to be found.
   *
   * Leaves focus alone when it is not on the document body: a customer who
   * tabbed on while the request was in flight keeps their place.
   *
   * @param itemKey The line the change landed on, as the server named it.
   * @param previousIndex The position the changed line held before the change,
   * used to place focus the way a removal does when there is no picker to
   * return to.
   */
  restoreFocusAfterVariantChange: (
    itemKey: string | undefined,
    previousIndex: number,
  ) => void
}

/**
 * Keeps keyboard focus on the basket page when a mutation unmounts the card
 * that held it. Used by the basket page together with `useBasketItemActions`,
 * which calls the restore functions once a removal or size change succeeds.
 *
 * Focus moves through keyed refs to the rendered cards rather than a
 * `data-testid` query (a test hook) or a global `document.querySelectorAll`
 * that escapes the page's subtree.
 *
 * @param renderedItems Every item the page renders, in the order the cards
 * appear. Positions are read off this order, so it has to agree with the
 * template.
 * @param emptyBasket The empty basket state component the page swaps in once
 * the last item is gone. `null` or `undefined` while it is not rendered.
 * @returns The card ref setter and the two focus restore functions.
 *
 * @example
 * ```vue
 * const emptyBasketRef = useTemplateRef<{ $el: HTMLElement }>('emptyBasket')
 * const { setCardRef, restoreFocusAfterRemoval } = useBasketItemFocus(
 *   renderedItems,
 *   emptyBasketRef,
 * )
 * // <SFBasketCard :ref="(el) => setCardRef(item.key, el)" ... />
 * ```
 */
export function useBasketItemFocus(
  renderedItems: MaybeRefOrGetter<readonly BasketItem[]>,
  emptyBasket: MaybeRefOrGetter<{ $el: HTMLElement } | null | undefined>,
): UseBasketItemFocusReturn {
  const cardRefs = new Map<string, BasketCardFocusTarget>()

  const setCardRef = (key: string, el: unknown) => {
    if (el) {
      cardRefs.set(key, el as BasketCardFocusTarget)
    } else {
      cardRefs.delete(key)
    }
  }

  const restoreFocusAfterRemoval = (removedIndex: number) => {
    const remaining = toValue(renderedItems)

    if (remaining.length) {
      const targetKey =
        remaining[Math.min(removedIndex, remaining.length - 1)]?.key
      const card = targetKey ? cardRefs.get(targetKey) : undefined
      card?.focus()
      return
    }

    toValue(emptyBasket)?.$el?.querySelector<HTMLElement>('a, button')?.focus()
  }

  const restoreFocusAfterVariantChange = (
    itemKey: string | undefined,
    previousIndex: number,
  ) => {
    // Only focus that fell to the body with the unmounted card is restored —
    // committing a size with Tab moves focus on before the response arrives.
    const isFocusUnplaced =
      !document.activeElement || document.activeElement === document.body
    if (!isFocusUnplaced) {
      return
    }

    // The named line renders a picker on this page unless it is a
    // subscription, which the service refuses to change in the first place.
    // Neither that nor the server naming a line is taken for granted, because
    // leaving focus on the document body is the state this restoration repairs.
    const card = itemKey ? cardRefs.get(itemKey) : undefined
    if (!card?.focusVariantSelector()) {
      restoreFocusAfterRemoval(previousIndex)
    }
  }

  return {
    setCardRef,
    restoreFocusAfterRemoval,
    restoreFocusAfterVariantChange,
  }
}
