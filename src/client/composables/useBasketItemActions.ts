import { nextTick, ref, toValue } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirmDialog } from '@vueuse/core'
import type { BasketItem } from '@scayle/storefront/types'
import { useBasket } from '@client/composables/useBasket'
import {
  useAnnouncer,
  ANNOUNCE_DEBOUNCE_MS,
} from '@client/composables/useAnnouncer'
import { useBasketEvents } from '@client/composables/tracking/useBasketEvents'

/** Inputs `useBasketItemActions` reads from the basket page. */
export interface UseBasketItemActionsOptions {
  /**
   * Every item the page renders, in the order the cards appear. The position
   * an item held before a mutation is read off this order and handed to the
   * focus restore functions.
   */
  renderedItems: MaybeRefOrGetter<readonly BasketItem[]>
  /**
   * Moves focus once a removal has unmounted the item's card. Called after the
   * next render, so the remaining cards are in place.
   */
  restoreFocusAfterRemoval: (removedIndex: number) => void
  /**
   * Moves focus once a size change has replaced the item's card. Called after
   * the next render with the line the server named and the old position.
   */
  restoreFocusAfterVariantChange: (
    itemKey: string | undefined,
    previousIndex: number,
  ) => void
}

interface UseBasketItemActionsReturn {
  /**
   * Items with a mutation in flight, by item key. `true` while the request
   * runs, `false` after a failure, absent once a mutation succeeds. Bind each
   * card's `loading` prop to it so the card ignores input meanwhile.
   */
  loadingItems: Ref<Map<string, boolean>>
  /**
   * Changes an item's quantity and announces the new quantity once it
   * succeeds. `useBasket().updateItemQuantity` fires the basket events itself.
   *
   * @param item The basket item to change.
   * @param newQuantity The quantity the customer picked.
   */
  updateQuantity: (item: BasketItem, newQuantity: number) => Promise<void>
  /**
   * Changes an item's size, announces the outcome, and restores focus to the
   * line the change landed on.
   *
   * @param item The basket item to change.
   * @param variantId The variant the customer picked.
   */
  changeVariant: (item: BasketItem, variantId: number) => Promise<void>
  /**
   * Asks the customer to confirm, then removes the item, fires
   * `remove_from_basket`, announces the outcome and restores focus.
   *
   * @param itemKey The key of the basket item to remove.
   */
  requestRemoval: (itemKey: string) => Promise<void>
  /** Whether the removal confirmation is open. Bind it to the modal. */
  isRemovalConfirmationRevealed: Ref<boolean>
  /** Accepts the pending removal. Bind it to the modal's `confirm` event. */
  confirmRemoval: () => void
  /** Drops the pending removal. Bind it to the modal's `cancel` event. */
  cancelRemoval: () => void
}

/**
 * Runs the changes a customer makes to basket items on the basket page: the
 * quantity, the size, and removal behind a confirmation. Each action marks the
 * item as loading while it runs, announces the result through the shared live
 * regions (`polite` for successful changes, `assertive` for failures), and
 * hands focus to the caller's restore functions once a card is replaced or
 * gone. Pair it with `useBasketItemFocus`, which provides those functions.
 *
 * @param options The rendered items and the focus restore functions.
 * @param options.renderedItems Every item the page renders, in the order the
 * cards appear.
 * @param options.restoreFocusAfterRemoval Called after the next render, once a
 * removal has unmounted the item's card.
 * @param options.restoreFocusAfterVariantChange Called after the next render
 * with the line the server named and the old position.
 * @returns The loading state per item, the three actions, and the removal
 * confirmation state to bind to `SFBasketDeleteConfirmationModal`.
 *
 * @example
 * ```vue
 * const { loadingItems, updateQuantity, changeVariant, requestRemoval } =
 *   useBasketItemActions({
 *     renderedItems,
 *     restoreFocusAfterRemoval,
 *     restoreFocusAfterVariantChange,
 *   })
 * // <SFBasketCard :loading="loadingItems.get(item.key)" @delete="requestRemoval(item.key)" ... />
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/basket-and-wishlist/basket
 */
export function useBasketItemActions({
  renderedItems,
  restoreFocusAfterRemoval,
  restoreFocusAfterVariantChange,
}: UseBasketItemActionsOptions): UseBasketItemActionsReturn {
  // A change to the basket can unlock or forfeit a gift promotion, so the
  // basket page's own `giftPromotions` prop reloads with the basket.
  const { updateItemQuantity, changeItemVariant, removeItem } = useBasket([
    'giftPromotions',
  ])
  const { trackRemoveFromBasket } = useBasketEvents()
  const { t } = useI18n()
  const { announce } = useAnnouncer()
  const {
    isRevealed: isRemovalConfirmationRevealed,
    reveal: revealRemovalConfirmation,
    confirm: confirmRemoval,
    cancel: cancelRemoval,
  } = useConfirmDialog()

  // Distinct messages announce immediately; only a repeat of the same message
  // (e.g. clicking quantity-up several times) is debounced, to avoid spamming AT
  // during fast interactions. Debouncing across distinct messages would swallow
  // the first — e.g. a quantity change followed by a removal within the window.
  let lastPolite = ''
  const announcePolite = (text: string) => {
    const debounce = text === lastPolite ? ANNOUNCE_DEBOUNCE_MS : undefined
    lastPolite = text
    announce(text, { debounce })
  }

  // Failures announce immediately on the assertive region.
  const announceAssertive = (text: string) =>
    announce(text, { politeness: 'assertive' })

  const loadingItems = ref(new Map<string, boolean>())

  const findRenderedIndex = (itemKey: string) =>
    toValue(renderedItems).findIndex((entry) => entry.key === itemKey)

  const updateQuantity = async (item: BasketItem, newQuantity: number) => {
    loadingItems.value.set(item.key, true)
    const success = await updateItemQuantity(item, newQuantity)
    if (success) {
      announcePolite(
        t('basket.a11y.quantity_changed', {
          name: item.product.name,
          count: newQuantity,
        }),
      )
      loadingItems.value.delete(item.key)
    } else {
      loadingItems.value.set(item.key, false)
    }
  }

  const changeVariant = async (item: BasketItem, variantId: number) => {
    const previousIndex = findRenderedIndex(item.key)

    loadingItems.value.set(item.key, true)
    // Not destructured: `itemKey` sits on the successful member of the result
    // union, so the success check has to narrow it first.
    const result = await changeItemVariant(item, variantId)
    if (result.success) {
      announcePolite(
        t('basket.a11y.size_changed', {
          name: item.product.name,
          size: item.variants.find(({ id }) => id === variantId)?.label ?? '',
        }),
      )
      loadingItems.value.delete(item.key)
      await nextTick()
      restoreFocusAfterVariantChange(result.itemKey, previousIndex)
    } else {
      // After a failed reload the global error toast is the only message.
      // "Could not change the size" may be false, since the change may well
      // have landed. The toast's Reload link shows whether it did.
      if (!result.reloadFailed) {
        announceAssertive(
          t('basket.a11y.size_change_failed', { name: item.product.name }),
        )
      }
      loadingItems.value.set(item.key, false)
    }
  }

  const requestRemoval = async (itemKey: string) => {
    const { isCanceled } = await revealRemovalConfirmation()
    if (isCanceled) {
      return
    }

    loadingItems.value.set(itemKey, true)
    // Read before the removal, so the index doubles as the focus-restore target.
    const removedIndex = findRenderedIndex(itemKey)
    const item = toValue(renderedItems)[removedIndex]

    const result = await removeItem({ itemKey })
    if (result.success && item) {
      // Fire only after the oRPC mutation reports success so analytics never
      // see a remove event for an optimistic UI update that later reverted.
      trackRemoveFromBasket(item)
      announcePolite(t('basket.a11y.item_removed', { name: item.product.name }))
      await nextTick()
      restoreFocusAfterRemoval(removedIndex)
      loadingItems.value.delete(itemKey)
    } else {
      loadingItems.value.set(itemKey, false)
      // Same as a failed size change: the global error toast covers a failed
      // reload.
      const reloadFailed = !result.success && result.reloadFailed
      if (!reloadFailed) {
        announceAssertive(
          t('basket.a11y.remove_failed', { name: item?.product.name }),
        )
      }
    }
  }

  return {
    loadingItems,
    updateQuantity,
    changeVariant,
    requestRemoval,
    isRemovalConfirmationRevealed,
    confirmRemoval,
    cancelRemoval,
  }
}
