import { useI18n } from 'vue-i18n'
import { usePage } from '@client/composables/usePage'
import type { ComputedRef } from 'vue'
import { computed } from 'vue'
import type { Basket, BasketItem, Promotion } from '@scayle/storefront/types'
import { partialReload } from '@client/utils/router'
import type { ReloadError } from '@client/utils/router'
import type { InferClientInputs } from '@orpc/client'
import type { RouterClient } from '@orpc/server'
import type { APIRouter } from '../../server/api'
import { BASKET_SURFACE, useBasketEvents } from './tracking/useBasketEvents'
import { useAddToBasketSlideIn } from './useAddToBasketSlideIn'
import { useAnnouncer } from './useAnnouncer'
import { useRpcClient } from './useRpcClient'
import { useToast } from './useToast'

export type AddToBasketInput = InferClientInputs<
  RouterClient<APIRouter>
>['basket']['add']

/**
 * Finds the line a variant change landed on, by diffing the basket around it.
 * The change adds the target variant and removes the old line, so that line
 * either was not there before or grew: the Storefront API answers an add of a
 * variant a line already carries by raising that line's quantity.
 *
 * Approximate. A merge onto a line already at its stock cap grows nothing, and
 * a quantity change made elsewhere during the request grows a line too, so a
 * caller needs a fallback.
 *
 * @returns The key of the line the change landed on, `undefined` when none grew.
 */
function findChangedItemKey(
  before: readonly BasketItem[],
  after: readonly BasketItem[],
) {
  const quantitiesBeforeChange = new Map(
    before.map((entry) => [entry.key, entry.quantity]),
  )

  return after.find(
    (entry) => (quantitiesBeforeChange.get(entry.key) ?? 0) < entry.quantity,
  )?.key
}

/** Failed outcome of a basket line change. */
interface BasketChangeFailure {
  success: false
  /**
   * Set when the change was sent but the basket reload after it failed. The
   * global error toast has reported that, and the change may well have
   * landed, so the caller reports nothing of its own.
   */
  reloadFailed?: boolean
}

/**
 * Outcome of a basket line variant change. A successful change names the line
 * it landed on, so a caller can put keyboard focus back on it after the card
 * holding the old line was unmounted. The key is derived from the basket
 * around the change, so it is absent when no line can be told apart — see
 * {@link findChangedItemKey}.
 */
export type ChangeItemVariantResult =
  BasketChangeFailure | { success: true; itemKey?: string }

/** Outcome of a basket line removal. */
type RemoveItemResult = BasketChangeFailure | { success: true }

interface UseBasketReturn {
  /**
   * The basket data. `undefined` while the deferred prop resolves, `null` when
   * the fetch failed.
   */
  basket: ComputedRef<Basket | null | undefined>
  /**
   * Adds a variant to the basket and updates the basket data.
   * On success it opens the add-to-basket confirmation slide-in and announces
   * the add to screen readers; on failure it shows an error toast. A failed
   * basket reload shows the global error toast instead, and nothing else.
   *
   * @param item - The item to add to the basket
   * @param item.productName - The name of the product
   * @param item.variantId - The ID of the variant
   * @param item.quantity - The quantity of the item
   * @param item.customData - Optional custom data for the item (e.g. subscription configuration)
   *
   * @returns The number of units the basket gained when the add request
   * succeeded and the basket reload delivered, otherwise `false`. The
   * Storefront API caps an add at the available stock, in which case the
   * number is below the requested quantity and can be `0` when nothing was
   * added. A reload cancelled by navigating away also returns `false`, since
   * nothing confirms what landed. Callers gate `add_to_basket` on a truthy
   * result, so `0` and `false` both mean "nothing to track", and report the
   * number as the event quantity.
   */
  addItem: (item: {
    productName: string
    variantId: number
    quantity: number
    customData?: NonNullable<AddToBasketInput['customData']>
  }) => Promise<number | false>
  /**
   * Updates the quantity of an item in the basket.
   * Shows a success or error message based on the server response. A failed
   * basket reload shows the global error toast instead.
   *
   * @param item - The item to update the quantity of
   * @param newQuantity - The new quantity of the item
   *
   * @returns `true` when the update request succeeded and the basket reload
   * had no error, otherwise `false`.
   */
  updateItemQuantity: (
    item: BasketItem,
    newQuantity: number,
  ) => Promise<boolean>
  /**
   * Changes which variant a basket item holds, keeping its quantity. The
   * server caps the quantity at the new variant's available stock.
   *
   * Shows a success toast on a completed change, which also says so when the
   * line merged into one already holding the new size. When the new size
   * covered fewer units than the line held, an info toast naming the quantity
   * the basket ended up with replaces it. A failed change shows an error toast,
   * a failed basket reload the global error toast instead.
   *
   * Reports the change as `remove_from_basket` for the old line followed by
   * `add_to_basket` for the new variant, both on the basket surface: the
   * interaction has no event of its own. The add carries the units the new
   * variant actually gained, read from the reloaded basket. When it gains
   * none (a merge onto a line already at the stock cap), only the remove fires.
   *
   * @param item - The basket item to change the variant of
   * @param variantId - The variant the item should hold
   *
   * @returns Whether the change went through and the line it landed on, or on
   * a failure whether the basket reload failed.
   */
  changeItemVariant: (
    item: BasketItem,
    variantId: number,
  ) => Promise<ChangeItemVariantResult>
  /**
   * Removes an item from the basket.
   * Shows a success or error message based on the server response. A failed
   * basket reload shows the global error toast instead.
   *
   * @param item - The item to remove from the basket
   * @param item.itemKey - The key of the item to remove
   *
   * @returns Whether the removal went through, and on a failure whether the
   * basket reload failed.
   */
  removeItem: (item: { itemKey: string }) => Promise<RemoveItemResult>
  /**
   * Reloads the basket data from the server.
   *
   * @returns A promise that resolves when the reload finished, with `error` set
   * when it failed. The global error toast has already reported that failure.
   */
  reloadBasket: () => Promise<{ error?: ReloadError }>
  /**
   * Returns whether any basket item matches the given product ID.
   *
   * @param productId - The product ID to search for.
   * @returns `true` when at least one basket item matches, `false` otherwise.
   */
  hasProductInBasket: (productId: number) => boolean
  /**
   * Returns whether the given promotion is attached to any available basket item for the given product.
   * Returns `false` while the basket has not hydrated yet (`basket` is in the
   * deferred `customer-data` group).
   *
   * @param promotion - The promotion to look up by id.
   * @param productId - The product ID to search for.
   * @returns `true` when at least one available item lists the promotion in
   * `item.totalPrice.appliedReductions`, `false` otherwise.
   */
  isPromotionAppliedForProduct: (
    promotion: Promotion,
    productId: number,
  ) => boolean
  /**
   * Returns whether the given promotion id is currently in
   * `basket.giftPromotions`, which means the customer has unlocked the matching
   * free gift promotion and can still choose a gift. `Basket.giftPromotions`
   * describes when a promotion enters and leaves the list.
   *
   * @param promotionId - The promotion id to look up.
   * @returns `true` when the promotion id is present in `basket.giftPromotions`,
   *   `false` when absent or while the basket has not hydrated yet (basket is
   *   in the deferred `customer-data` group).
   */
  isGiftPromotionApplicable: (promotionId: string) => boolean
  /**
   * The count of items in the basket.
   */
  count: ComputedRef<number>
}

/**
 * Provides basket state and mutation methods for add, update, remove, and reload flows.
 *
 * @returns An object with the basket data and methods: addItem, updateItemQuantity, removeItem, and reloadBasket.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/basket-and-wishlist/basket
 */
export function useBasket(includeOnly: string[] = []): UseBasketReturn {
  const page = usePage()
  const { show } = useToast()
  const { announce } = useAnnouncer()
  const { open: openAddToBasketSlideIn } = useAddToBasketSlideIn()
  const rpcClient = useRpcClient()
  const { t } = useI18n()
  const { trackAddToBasket, trackRemoveFromBasket } = useBasketEvents()
  const basket = computed(() => page.props.basket)

  const reloadBasket = () => partialReload(['basket', ...includeOnly])

  const items = computed(() =>
    basket.value
      ? [...basket.value.availableItems, ...basket.value.unavailableItems]
      : [],
  )

  /**
   * Sums the units of a variant across the basket lines, since the same
   * variant can sit on several lines with different custom data. Counts
   * unavailable lines too: a capped add can land on a line the Storefront API
   * reports as unavailable, and those units are still in the basket.
   */
  const variantQuantity = (variantId: number) =>
    items.value.reduce(
      (sum, basketItem) =>
        basketItem.variant.id === variantId ? sum + basketItem.quantity : sum,
      0,
    )

  const addItem = async (item: {
    productName: string
    variantId: number
    quantity: number
    customData?: NonNullable<AddToBasketInput['customData']>
  }) => {
    // The basket prop is deferred and `undefined` until it arrives (`null`
    // when its fetch failed). Without a known starting point a capped add
    // cannot compute the units gained and reports the requested quantity.
    const hasBasketBefore = !!basket.value
    const quantityBefore = variantQuantity(item.variantId)
    // The same variant can sit on several lines with different custom data, so
    // the line to confirm is identified by what actually grew, not by variant
    // alone.
    const quantitiesByKeyBefore = new Map(
      items.value.map((basketItem) => [basketItem.key, basketItem.quantity]),
    )
    const { error, isDefined, data } = await rpcClient.basket.add({
      variantId: item.variantId,
      quantity: item.quantity,
      customData: item.customData,
    })

    const { error: reloadError, cancelled: reloadCancelled } =
      await reloadBasket()

    // A failed reload already showed the global error toast. Its Reload link
    // shows whether the add landed. A toast or the slide-in here would be a
    // second message about a basket the client never received. The other
    // mutations below skip their toasts for the same reason.
    if (reloadError) {
      return false
    }

    if (isDefined) {
      switch (error.code) {
        case 'INTERNAL_SERVER_ERROR':
        case 'ITEM_ALREADY_IN_BASKET':
        case 'FAILED_DEPENDENCY':
        case 'LOCKED':
        case 'NOT_FOUND':
        case 'INVALID_SUBSCRIPTION_DEFINITION':
          show(
            t('add_to_basket.notification.add_to_basket_error', {
              productName: item.productName,
            }),
            {
              type: 'ERROR',
            },
          )
          break
        case 'VARIANT_OUT_OF_STOCK':
          show(
            t(
              'add_to_basket.notification.add_to_basket_variant_out_of_stock_error',
              {
                productName: item.productName,
              },
            ),
            {
              type: 'ERROR',
            },
          )
          break
        case 'QUANTITY_LIMIT_EXCEEDED':
          show(
            t(
              'add_to_basket.notification.add_to_basket_max_basket_items_error',
              {
                productName: item.productName,
              },
            ),
            {
              type: 'ERROR',
            },
          )
          break
      }
      return false
    } else if (error) {
      show(
        t('add_to_basket.notification.add_to_basket_error', {
          productName: item.productName,
        }),
        {
          type: 'ERROR',
        },
      )
      return false
    } else if (reloadCancelled) {
      // The add itself may well have succeeded, but the reload that would
      // confirm it never delivered, so `items.value` still holds the pre-add
      // basket. Silent on purpose: the user navigated away, a toast would land
      // on the page they went to, and an announcement would claim an add the
      // client never saw. `false` keeps the units out of `add_to_basket` too.
      return false
    } else {
      // Only a line that actually grew confirms the add. A capped add can land
      // zero units, which leaves every line at its previous quantity —
      // confirming that would show the user an item they did not get.
      const addedItem = items.value.find(
        (basketItem) =>
          basketItem.variant.id === item.variantId &&
          (quantitiesByKeyBefore.get(basketItem.key) ?? 0) <
            basketItem.quantity,
      )

      if (addedItem) {
        openAddToBasketSlideIn(addedItem)
      }

      // The reduced-quantity message reports exhausted stock rather than a
      // landed unit, so it holds even for a capped add that gained nothing.
      if (data.addedWithReducedQuantity) {
        show(
          t('add_to_basket.notification.added_with_reduced_quantity', {
            productName: item.productName,
          }),
          {
            type: 'INFO',
          },
        )
      } else if (addedItem) {
        // The slide-in replaced the success toast, and a dialog opening is
        // not an announcement on its own. Without this the add is silent for
        // screen reader users.
        announce(
          t('add_to_basket.notification.add_to_basket_success', {
            productName: item.productName,
          }),
        )
      }
      // The add response only says whether the quantity was capped, so the
      // units actually added come from the reloaded basket.
      return data.addedWithReducedQuantity && hasBasketBefore
        ? Math.max(variantQuantity(item.variantId) - quantityBefore, 0)
        : item.quantity
    }
  }

  const updateItemQuantity = async (item: BasketItem, newQuantity: number) => {
    const result = await rpcClient.basket.update({
      itemKey: item.key,
      quantity: newQuantity,
    })
    const { error: reloadError } = await reloadBasket()
    if (reloadError) {
      return false
    }
    const isSuccess = !result.error
    show(
      isSuccess
        ? t('add_to_basket.notification.update_basket_item_quantity_success')
        : t('add_to_basket.notification.update_basket_item_quantity_error'),
      {
        type: isSuccess ? 'SUCCESS' : 'ERROR',
      },
    )

    // Both events report the delta of this interaction, not the resulting
    // line quantity: raising a line from two to three units adds one. An
    // unchanged quantity reports nothing; `SFQuantityInput` does not emit
    // one today, but a remove_from_basket with quantity 0 would pass the
    // route, so the guard is here rather than in the input. The Storefront
    // API caps an increase at the available stock, so the added units come
    // from the reloaded line rather than the requested quantity.
    if (isSuccess) {
      if (newQuantity > item.quantity) {
        const updatedQuantity =
          items.value.find((basketItem) => basketItem.key === item.key)
            ?.quantity ?? newQuantity
        const addedQuantity = updatedQuantity - item.quantity
        if (addedQuantity > 0) {
          trackAddToBasket(
            item.variant,
            item.product,
            addedQuantity,
            BASKET_SURFACE,
          )
        }
      } else if (newQuantity < item.quantity) {
        trackRemoveFromBasket(item, item.quantity - newQuantity)
      }
    }

    return isSuccess
  }

  const changeItemVariant = async (
    item: BasketItem,
    variantId: number,
  ): Promise<ChangeItemVariantResult> => {
    // Read before the reload below replaces the prop, to diff the change
    // against.
    const itemsBeforeChange = items.value

    const quantityBefore = variantQuantity(variantId)
    const result = await rpcClient.basket.changeVariant({
      itemKey: item.key,
      variantId,
    })
    const { error: reloadError } = await reloadBasket()
    if (reloadError) {
      return { success: false, reloadFailed: true }
    }

    if (result.error) {
      show(t('basket.size_selector.notification.error'), { type: 'ERROR' })
      return { success: false }
    }

    // A size change has no event of its own: it reports as the remove of the
    // old line followed by the add of the new variant. The reloaded basket
    // decides both halves. The server removes the old line only after the add
    // went through and keeps the add when that remove fails, so a line still
    // present was not removed. The units the new variant gained come from the
    // reloaded basket too, since the Storefront API caps them at stock.
    const oldLineRemains = items.value.some(
      (basketItem) => basketItem.key === item.key,
    )
    if (!oldLineRemains) {
      trackRemoveFromBasket(item)
    }
    const addedQuantity = variantQuantity(variantId) - quantityBefore
    const newLine = items.value.find(
      (basketItem) => basketItem.variant.id === variantId,
    )
    if (addedQuantity > 0 && newLine) {
      trackAddToBasket(
        newLine.variant,
        newLine.product,
        addedQuantity,
        BASKET_SURFACE,
      )
    }

    const itemKey = findChangedItemKey(itemsBeforeChange, items.value)

    // The basket now holds both sizes. Neither the success nor the error
    // message fits: the new size was added, and a retry would add its units a
    // second time.
    if (oldLineRemains) {
      show(t('basket.size_selector.notification.previous_size_kept'), {
        type: 'WARNING',
      })
    } else if (result.data?.addedWithReducedQuantity) {
      // The change went through, but the new size covers fewer units than the
      // line held. Nothing else on the page says so — the line simply shows a
      // lower quantity — so the reduction takes the place of the generic
      // success confirmation rather than stacking a second toast under it.
      // The server reports the resulting quantity from the basket it read back
      // after the change. It has none when the old line could not be removed,
      // and the basket reloaded just above is then the only place the units
      // are known. Passed positionally, the form that selects a plural branch.
      show(
        t(
          'basket.size_selector.notification.reduced_quantity',
          result.data.quantity ?? variantQuantity(variantId),
        ),
        { type: 'INFO' },
      )
    } else {
      // The line now holding the new size was in the basket before the change,
      // so the old line merged into it and the basket shows one line fewer.
      // Without saying so, the customer is left looking for a line that is gone.
      const mergedIntoExistingLine = itemsBeforeChange.some(
        (basketItem) => basketItem.key === itemKey,
      )
      show(
        mergedIntoExistingLine
          ? t('basket.size_selector.notification.success_merged')
          : t('basket.size_selector.notification.success'),
        { type: 'SUCCESS' },
      )
    }

    return { success: true, itemKey }
  }

  const removeItem = async (item: {
    itemKey: string
  }): Promise<RemoveItemResult> => {
    const result = await rpcClient.basket.remove({
      itemKey: item.itemKey,
    })
    const { error: reloadError } = await reloadBasket()
    if (reloadError) {
      return { success: false, reloadFailed: true }
    }

    const isSuccess = !result.error
    show(
      isSuccess
        ? t('add_to_basket.notification.remove_basket_item_success')
        : t('add_to_basket.notification.remove_basket_item_error'),
      {
        type: isSuccess ? 'SUCCESS' : 'ERROR',
      },
    )

    return { success: isSuccess }
  }

  const count = computed(() => basket.value?.itemCount ?? 0)

  const hasProductInBasket = (productId: number) =>
    items.value.some((item) => item.product.id === productId)

  const isPromotionAppliedForProduct = (
    promotion: Promotion,
    productId: number,
  ): boolean => {
    return (
      basket.value?.availableItems.some(
        (item) =>
          item.product.id === productId &&
          item.totalPrice.appliedReductions.some(
            (reduction) =>
              reduction.category === 'promotion' &&
              reduction.promotionId === promotion.id,
          ),
      ) ?? false
    )
  }

  const isGiftPromotionApplicable = (promotionId: string): boolean =>
    basket.value?.giftPromotions.some((p) => p.id === promotionId) ?? false

  return {
    basket,
    count,
    addItem,
    updateItemQuantity,
    changeItemVariant,
    removeItem,
    reloadBasket,
    hasProductInBasket,
    isPromotionAppliedForProduct,
    isGiftPromotionApplicable,
  }
}
