import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  Basket,
  BasketItem,
  BuyXGetYEffect,
  Promotion,
} from '@scayle/storefront/types'
import { createSafeFailure, createSafeSuccess } from '@test/utils/orpc'
import type { ReactivePageMock } from '@test/utils/inertia'
import { useAddToBasketSlideIn } from './useAddToBasketSlideIn'
import { useBasket } from './useBasket'

interface ReloadOpts {
  only: string[]
  onFinish?: () => void
  onHttpException?: (response: unknown) => void
  onCancel?: () => void
}

const mocks = vi.hoisted(() => ({
  reactivePage: null as ReactivePageMock | null,
  routerReload: vi.fn(),
  reloadImpl: null as ((opts: ReloadOpts) => void) | null,
  rpcAdd: vi.fn(),
  rpcUpdate: vi.fn(),
  rpcChangeVariant: vi.fn(),
  rpcRemove: vi.fn(),
  toastShow: vi.fn(),
  announce: vi.fn(),
  translate: vi.fn((key: string) => key),
  trackAddToBasket: vi.fn(),
  trackRemoveFromBasket: vi.fn(),
}))

vi.mock('./tracking/useBasketEvents', () => ({
  BASKET_SURFACE: { product_list_type: 'basket', product_list_id: null },
  useBasketEvents: () => ({
    trackAddToBasket: mocks.trackAddToBasket,
    trackRemoveFromBasket: mocks.trackRemoveFromBasket,
    trackViewBasket: vi.fn(),
  }),
}))

vi.mock('@inertiajs/vue3', async () => {
  const { createReactivePage } = await import('@test/utils/inertia')
  mocks.reactivePage = createReactivePage()

  return {
    usePage: vi.fn(() => mocks.reactivePage),
    router: {
      reload: (opts: ReloadOpts) => {
        mocks.routerReload(opts)
        if (mocks.reloadImpl) {
          mocks.reloadImpl(opts)
        } else {
          opts.onFinish?.()
        }
      },
    },
  }
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: mocks.translate }),
}))

vi.mock('@client/composables/useToast', () => ({
  useToast: () => ({ show: mocks.toastShow }),
}))

vi.mock('./useAnnouncer', () => ({
  useAnnouncer: () => ({ announce: mocks.announce }),
}))

vi.mock('@client/composables/useRpcClient', async () => {
  const { createRpcClientMock } = await import('@test/utils/orpc')
  return createRpcClientMock({
    basket: {
      add: mocks.rpcAdd,
      update: mocks.rpcUpdate,
      changeVariant: mocks.rpcChangeVariant,
      remove: mocks.rpcRemove,
    },
  })
})

function createBasket(
  items: BasketItem[] = [],
  unavailableItems: BasketItem[] = [],
  itemCount = 0,
): Basket {
  return {
    itemCount,
    availableItems: items as Basket['availableItems'],
    unavailableItems: unavailableItems as Basket['unavailableItems'],
    promotionCodes: [],
    giftPromotions: [],
    cost: {
      finalPrice: '10',
      finalPriceInCents: 1000,
      finalPriceWithoutTaxInCents: 1000,
      subtotal: '10',
      totalWithoutPromotionsInCents: 1000,
      saleAndVoucherReductions: [],
      saleReductionSumInCents: 0,
      campaignReductionSumInCents: 0,
      promotionReductionSumInCents: 0,
      hasCampaignReduction: false,
      hasReductions: false,
      currency: 'EUR',
      promotionReductionsPerPromotion: [],
    },
  }
}

/**
 * Builds a basket line with only the fields the composable reads: the key
 * and quantity it diffs, and the variant and product it matches and tracks.
 */
const line = (key: string, quantity: number, variantId = 5) =>
  ({
    key,
    quantity,
    variant: { id: variantId },
    product: { id: 1 },
  }) as BasketItem

/** Seeds the basket the composable starts from. */
function setBasket(available: BasketItem[], unavailable: BasketItem[] = []) {
  mocks.reactivePage!.props.basket = createBasket(available, unavailable)
}

/** Makes the next basket reload deliver this basket, as after a mutation. */
function reloadWith(available: BasketItem[], unavailable: BasketItem[] = []) {
  mocks.reloadImpl = (opts) => {
    setBasket(available, unavailable)
    opts.onFinish?.()
  }
}

/** Makes the next basket reload fail the way Inertia reports a 5xx answer. */
function failReload() {
  mocks.reloadImpl = (opts) => {
    opts.onHttpException?.({ status: 500 })
    opts.onFinish?.()
  }
}

const BASKET_SURFACE = { product_list_type: 'basket', product_list_id: null }

describe('useBasket', () => {
  // The `client` test project runs in a node (SSR) env, where the slide-in's
  // writers are inert by design; force the client branch so `addItem` can open it.
  beforeEach(() => {
    vi.stubEnv('SSR', false)
    mocks.reactivePage!.props = {}
    mocks.reloadImpl = null
    useAddToBasketSlideIn().close()
  })

  // Coalescing and cancellation belong to `partialReload` and are covered in
  // `utils/router.test.ts`; useBasket only owns the list of props it reloads.
  describe('reloadBasket', () => {
    it('merges includeOnly keys into the partial reload list', async () => {
      const { reloadBasket } = useBasket(['giftPromotion', 'giftPromotions'])

      await reloadBasket()

      expect(mocks.routerReload).toHaveBeenCalledWith(
        expect.objectContaining({
          only: ['basket', 'giftPromotion', 'giftPromotions'],
        }),
      )
    })
  })

  describe('basket', () => {
    it('returns undefined when basket prop is missing', () => {
      const { basket } = useBasket()
      expect(basket.value).toBeUndefined()
    })
  })

  describe('isPromotionApplied', () => {
    const promo = { id: 'promo-1' } as Promotion

    const promotedLine = (promotionId?: string) =>
      ({
        ...line('line-1', 1),
        totalPrice: {
          appliedReductions: promotionId
            ? [
                {
                  category: 'promotion',
                  promotionId,
                  type: 'absolute',
                  amount: '$1.00',
                },
              ]
            : [],
        },
      }) as unknown as BasketItem

    it('returns false when basket is undefined', () => {
      const { isPromotionAppliedForProduct } = useBasket()
      expect(isPromotionAppliedForProduct(promo, 1)).toBe(false)
    })

    it('returns true when an available item lists the promotion', () => {
      setBasket([promotedLine('promo-1')])

      const { isPromotionAppliedForProduct } = useBasket()
      expect(isPromotionAppliedForProduct(promo, 1)).toBe(true)
    })

    it('returns false when the product id does not match', () => {
      setBasket([promotedLine('promo-1')])

      const { isPromotionAppliedForProduct } = useBasket()
      expect(isPromotionAppliedForProduct(promo, 2)).toBe(false)
    })

    it('returns false when no available item lists the promotion', () => {
      setBasket([promotedLine('other'), promotedLine()])

      const { isPromotionAppliedForProduct } = useBasket()
      expect(isPromotionAppliedForProduct(promo, 1)).toBe(false)
    })
  })

  describe('count', () => {
    it('returns 0 when basket is undefined', () => {
      const { count } = useBasket()
      expect(count.value).toBe(0)
    })

    // The count is computed by `BasketMapper`, so the composable only reads it
    // through. The counting rules are covered in the mapper's own tests.
    it('reports the count the server put on the basket', () => {
      mocks.reactivePage!.props.basket = createBasket(
        [line('line-1', 2), line('line-2', 3)],
        [],
        5,
      )

      const { count } = useBasket()
      expect(count.value).toBe(5)
    })
  })

  describe('isGiftPromotionApplicable', () => {
    const setGiftPromotion = (id: string) => {
      mocks.reactivePage!.props.basket = {
        ...createBasket(),
        giftPromotions: [{ id } as Promotion<BuyXGetYEffect>],
      }
    }

    it('returns false when basket is undefined', () => {
      const { isGiftPromotionApplicable } = useBasket()
      expect(isGiftPromotionApplicable('promo-1')).toBe(false)
    })

    it('returns true when giftPromotions contains the id', () => {
      setGiftPromotion('promo-1')

      const { isGiftPromotionApplicable } = useBasket()
      expect(isGiftPromotionApplicable('promo-1')).toBe(true)
    })

    it('returns false when giftPromotions does not contain the id', () => {
      setGiftPromotion('other')

      const { isGiftPromotionApplicable } = useBasket()
      expect(isGiftPromotionApplicable('promo-1')).toBe(false)
    })
  })

  describe('hasProductInBasket', () => {
    it('returns false while the basket prop has not arrived', () => {
      const { hasProductInBasket } = useBasket()

      expect(hasProductInBasket(1)).toBe(false)
    })

    it('returns true when an available item carries the product', () => {
      setBasket([line('line-1', 1)])
      const { hasProductInBasket } = useBasket()

      expect(hasProductInBasket(1)).toBe(true)
    })

    it('returns true when only an unavailable item carries the product', () => {
      setBasket([], [line('line-1', 1)])
      const { hasProductInBasket } = useBasket()

      expect(hasProductInBasket(1)).toBe(true)
    })

    it('returns false when no item carries the product', () => {
      setBasket([line('line-1', 1)])
      const { hasProductInBasket } = useBasket()

      expect(hasProductInBasket(2)).toBe(false)
    })
  })

  describe('addItem', () => {
    const resolveAdd = (addedWithReducedQuantity: boolean) =>
      mocks.rpcAdd.mockResolvedValueOnce(
        createSafeSuccess({ addedWithReducedQuantity }),
      )

    it('forwards customData to the basket add RPC', async () => {
      resolveAdd(false)
      const { addItem } = useBasket()
      const customData = {
        subscriptionDefinition: { subscriptionInterval: 'monthly' },
      }

      await addItem({
        productName: 'X',
        variantId: 5,
        quantity: 1,
        customData,
      })

      expect(mocks.rpcAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          variantId: 5,
          quantity: 1,
          customData,
        }),
      )
    })

    it('sends no price promotion key to the basket add RPC', async () => {
      resolveAdd(false)
      const { addItem } = useBasket()

      await addItem({ productName: 'X', variantId: 5, quantity: 1 })

      // The server derives the subscription key from a verified definition;
      // the route does not accept one from the client.
      expect(mocks.rpcAdd.mock.lastCall?.[0]).not.toHaveProperty(
        'pricePromotionKey',
      )
    })

    it('resolves with the requested quantity when the add was not capped', async () => {
      resolveAdd(false)
      const { addItem } = useBasket()

      const added = await addItem({
        productName: 'X',
        variantId: 5,
        quantity: 3,
      })

      expect(added).toBe(3)
    })

    it('resolves with the units the basket gained when the Storefront API capped the add', async () => {
      setBasket([line('line-1', 1)])
      resolveAdd(true)
      // Stock allowed one more unit, not two.
      reloadWith([line('line-1', 2)])
      const { addItem } = useBasket()

      const added = await addItem({
        productName: 'X',
        variantId: 5,
        quantity: 2,
      })

      expect(added).toBe(1)
    })

    it('sums the variant across its basket lines when a capped add lands on a second line', async () => {
      // A subscription adds the same variant with custom data, which the
      // Storefront API keeps as a separate line.
      setBasket([line('line-1', 1), line('line-2', 1)])
      resolveAdd(true)
      reloadWith([line('line-1', 1), line('line-2', 2)])
      const { addItem } = useBasket()

      const added = await addItem({
        productName: 'X',
        variantId: 5,
        quantity: 3,
        customData: {
          subscriptionDefinition: { subscriptionInterval: 'monthly' },
        },
      })

      expect(added).toBe(1)
    })

    it('counts a capped add that landed on an unavailable line', async () => {
      // The Storefront API can report the line the add landed on as
      // unavailable, for example once its sellable timeframe ended. The units
      // are in the basket either way, so the add is still tracked.
      setBasket([], [line('line-1', 1)])
      resolveAdd(true)
      reloadWith([], [line('line-1', 2)])
      const { addItem } = useBasket()

      const added = await addItem({
        productName: 'X',
        variantId: 5,
        quantity: 2,
      })

      expect(added).toBe(1)
    })

    // A capped add can land zero units, which leaves every line at its previous
    // quantity. Confirming one of them would show the user an item they did
    // not get, while the reduced-quantity message reports exhausted stock and
    // so is still accurate.
    it('confirms nothing and reports exhausted stock when a capped add gained nothing', async () => {
      setBasket([line('line-1', 2)])
      resolveAdd(true)
      reloadWith([line('line-1', 2)])
      const { addItem } = useBasket()

      const added = await addItem({
        productName: 'X',
        variantId: 5,
        quantity: 1,
      })

      expect(added).toBe(0)
      expect(useAddToBasketSlideIn().isOpen.value).toBe(false)
      expect(mocks.announce).not.toHaveBeenCalled()
      expect(mocks.toastShow).toHaveBeenCalledWith(
        'add_to_basket.notification.added_with_reduced_quantity',
        { type: 'INFO' },
      )
    })

    it('reports the requested quantity for a capped add when the basket prop had not arrived', async () => {
      // `basket` is deferred: with no starting point the units gained cannot
      // be computed, and the requested quantity is the better guess than the
      // whole reloaded line.
      resolveAdd(true)
      reloadWith([line('line-1', 4)])
      const { addItem } = useBasket()

      const added = await addItem({
        productName: 'X',
        variantId: 5,
        quantity: 2,
      })

      expect(added).toBe(2)
    })

    it('opens the confirmation slide-in on the line that gained units, and shows no success toast', async () => {
      // The same variant sits on two lines (a plain add and a subscription), so
      // the confirmation has to follow the quantity, not the variant id.
      setBasket([line('line-1', 1), line('line-2', 1)])
      resolveAdd(false)
      reloadWith([line('line-1', 1), line('line-2', 2)])
      const { addItem } = useBasket()

      await addItem({ productName: 'X', variantId: 5, quantity: 1 })

      const { isOpen, addedItem } = useAddToBasketSlideIn()
      expect(isOpen.value).toBe(true)
      expect(addedItem.value?.key).toBe('line-2')
      expect(mocks.toastShow).not.toHaveBeenCalled()
    })

    it('announces the add, since the slide-in replaced the success toast', async () => {
      setBasket([])
      resolveAdd(false)
      // The success announcement follows the line that grew, so the reload has
      // to deliver it.
      reloadWith([line('line-1', 1)])
      const { addItem } = useBasket()

      await addItem({ productName: 'X', variantId: 5, quantity: 1 })

      expect(mocks.announce).toHaveBeenCalledWith(
        'add_to_basket.notification.add_to_basket_success',
      )
    })

    it('shows the capped quantity instead when the Storefront API reduced the add', async () => {
      setBasket([])
      resolveAdd(true)
      const { addItem } = useBasket()

      await addItem({ productName: 'X', variantId: 5, quantity: 2 })

      // `show` mirrors the toast to the live region itself, so a direct
      // announcement would read the message twice.
      expect(mocks.announce).not.toHaveBeenCalled()
      expect(mocks.toastShow).toHaveBeenCalledWith(
        'add_to_basket.notification.added_with_reduced_quantity',
        { type: 'INFO' },
      )
    })

    // Inertia cancels the in-flight basket reload when the user navigates away
    // and fires `onFinish` without an error callback, so the reload reports no error
    // while the basket props still hold their pre-add values.
    it('stays silent and reports nothing when the basket reload was cancelled', async () => {
      setBasket([line('line-1', 2)])
      resolveAdd(false)
      mocks.reloadImpl = (opts) => {
        opts.onCancel?.()
        opts.onFinish?.()
      }
      const { addItem } = useBasket()

      const added = await addItem({
        productName: 'X',
        variantId: 5,
        quantity: 1,
      })

      expect(added).toBe(false)
      expect(mocks.announce).not.toHaveBeenCalled()
      expect(mocks.toastShow).not.toHaveBeenCalled()
      expect(useAddToBasketSlideIn().isOpen.value).toBe(false)
    })

    it('resolves with false, leaves the slide-in closed and shows an error toast when the add failed', async () => {
      mocks.rpcAdd.mockResolvedValueOnce(createSafeFailure(new Error('failed')))
      const { addItem } = useBasket()

      const added = await addItem({
        productName: 'X',
        variantId: 5,
        quantity: 1,
      })

      expect(added).toBe(false)
      expect(useAddToBasketSlideIn().isOpen.value).toBe(false)
      expect(mocks.toastShow).toHaveBeenCalledWith(
        'add_to_basket.notification.add_to_basket_error',
        { type: 'ERROR' },
      )
    })

    it.for([
      [
        'INTERNAL_SERVER_ERROR',
        'add_to_basket.notification.add_to_basket_error',
      ],
      [
        'ITEM_ALREADY_IN_BASKET',
        'add_to_basket.notification.add_to_basket_error',
      ],
      ['FAILED_DEPENDENCY', 'add_to_basket.notification.add_to_basket_error'],
      ['LOCKED', 'add_to_basket.notification.add_to_basket_error'],
      ['NOT_FOUND', 'add_to_basket.notification.add_to_basket_error'],
      [
        'INVALID_SUBSCRIPTION_DEFINITION',
        'add_to_basket.notification.add_to_basket_error',
      ],
      [
        'VARIANT_OUT_OF_STOCK',
        'add_to_basket.notification.add_to_basket_variant_out_of_stock_error',
      ],
      [
        'QUANTITY_LIMIT_EXCEEDED',
        'add_to_basket.notification.add_to_basket_max_basket_items_error',
      ],
    ] as const)(
      'resolves with false and shows an error toast naming the product when the add fails with %s',
      async ([code, messageKey]) => {
        mocks.rpcAdd.mockResolvedValueOnce(createSafeFailure({ code }, true))
        const { addItem } = useBasket()

        const added = await addItem({
          productName: 'Sneaker',
          variantId: 5,
          quantity: 1,
        })

        expect(added).toBe(false)
        expect(mocks.translate).toHaveBeenCalledWith(messageKey, {
          productName: 'Sneaker',
        })
        expect(mocks.toastShow).toHaveBeenCalledWith(messageKey, {
          type: 'ERROR',
        })
      },
    )
  })

  describe('updateItemQuantity', () => {
    const current = line('line-1', 2)

    it.for([
      {
        name: 'the update and the reload succeed',
        setup: () =>
          mocks.rpcUpdate.mockResolvedValueOnce(createSafeSuccess({})),
        result: true,
        toast: [
          'add_to_basket.notification.update_basket_item_quantity_success',
          { type: 'SUCCESS' },
        ],
      },
      {
        name: 'the update fails',
        setup: () =>
          mocks.rpcUpdate.mockResolvedValueOnce(
            createSafeFailure(new Error('failed')),
          ),
        result: false,
        toast: [
          'add_to_basket.notification.update_basket_item_quantity_error',
          { type: 'ERROR' },
        ],
      },
    ])(
      'resolves and shows a toast when $name',
      async ({ setup, result, toast }) => {
        setup()
        const { updateItemQuantity } = useBasket()

        expect(await updateItemQuantity(current, 3)).toBe(result)
        expect(mocks.toastShow).toHaveBeenCalledWith(...toast)
      },
    )

    it('fires add_to_basket once with the units added on the basket surface, not the new line quantity', async () => {
      mocks.rpcUpdate.mockResolvedValueOnce(createSafeSuccess({}))
      // The reload delivers the line at its new quantity.
      reloadWith([line('line-1', 3)])
      const { updateItemQuantity } = useBasket()

      await updateItemQuantity(current, 3)

      expect(mocks.trackAddToBasket).toHaveBeenCalledExactlyOnceWith(
        current.variant,
        current.product,
        1,
        BASKET_SURFACE,
      )
      expect(mocks.trackRemoveFromBasket).not.toHaveBeenCalled()
    })

    it('reports the units the line actually gained when the Storefront API capped the increase', async () => {
      mocks.rpcUpdate.mockResolvedValueOnce(
        createSafeSuccess({ addedWithReducedQuantity: true }),
      )
      // Requested 4, stock allowed 3: the reloaded line carries the capped quantity.
      reloadWith([line('line-1', 3)])
      const { updateItemQuantity } = useBasket()

      await updateItemQuantity(current, 4)

      expect(mocks.trackAddToBasket).toHaveBeenCalledWith(
        current.variant,
        current.product,
        1,
        BASKET_SURFACE,
      )
    })

    it('reads the reloaded line even when it comes back as unavailable', async () => {
      mocks.rpcUpdate.mockResolvedValueOnce(
        createSafeSuccess({ addedWithReducedQuantity: true }),
      )
      // Requested 4, stock allowed 3, and the reloaded line is unavailable.
      // Without reading both arrays the delta falls back to the requested 2.
      reloadWith([], [line('line-1', 3)])
      const { updateItemQuantity } = useBasket()

      await updateItemQuantity(current, 4)

      expect(mocks.trackAddToBasket).toHaveBeenCalledWith(
        current.variant,
        current.product,
        1,
        BASKET_SURFACE,
      )
    })

    it('reports the requested units when the reload delivers no basket', async () => {
      mocks.rpcUpdate.mockResolvedValueOnce(createSafeSuccess({}))
      const { updateItemQuantity } = useBasket()

      await updateItemQuantity(current, 4)

      expect(mocks.trackAddToBasket).toHaveBeenCalledWith(
        current.variant,
        current.product,
        2,
        BASKET_SURFACE,
      )
    })

    it('tracks nothing when the Storefront API capped an increase to no added units', async () => {
      mocks.rpcUpdate.mockResolvedValueOnce(
        createSafeSuccess({ addedWithReducedQuantity: true }),
      )
      // Requested 4, but the line was already at its stock cap of 2.
      reloadWith([current])
      const { updateItemQuantity } = useBasket()

      await updateItemQuantity(current, 4)

      expect(mocks.trackAddToBasket).not.toHaveBeenCalled()
    })

    it('fires remove_from_basket once with the units removed on a decrease', async () => {
      mocks.rpcUpdate.mockResolvedValueOnce(createSafeSuccess({}))
      const { updateItemQuantity } = useBasket()

      await updateItemQuantity(line('line-1', 5), 3)

      expect(mocks.trackRemoveFromBasket).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ key: 'line-1', quantity: 5 }),
        2,
      )
      expect(mocks.trackAddToBasket).not.toHaveBeenCalled()
    })

    it('tracks nothing when the quantity did not change', async () => {
      mocks.rpcUpdate.mockResolvedValueOnce(createSafeSuccess({}))
      const { updateItemQuantity } = useBasket()

      const result = await updateItemQuantity(current, current.quantity)

      expect(result).toBe(true)
      expect(mocks.trackAddToBasket).not.toHaveBeenCalled()
      expect(mocks.trackRemoveFromBasket).not.toHaveBeenCalled()
    })

    it('tracks nothing when the update fails', async () => {
      mocks.rpcUpdate.mockResolvedValueOnce(
        createSafeFailure(new Error('failed')),
      )
      const { updateItemQuantity } = useBasket()

      await updateItemQuantity(current, 3)

      expect(mocks.trackAddToBasket).not.toHaveBeenCalled()
      expect(mocks.trackRemoveFromBasket).not.toHaveBeenCalled()
    })
  })

  describe('changeItemVariant', () => {
    const current = line('line-1', 2)

    it('sends the item key and target variant, then reloads the basket', async () => {
      mocks.rpcChangeVariant.mockResolvedValueOnce(createSafeSuccess({}))
      const { changeItemVariant } = useBasket()

      const result = await changeItemVariant(current, 9)

      expect(result).toEqual({ success: true, itemKey: undefined })
      expect(mocks.rpcChangeVariant).toHaveBeenCalledWith({
        itemKey: 'line-1',
        variantId: 9,
      })
      expect(mocks.routerReload).toHaveBeenCalledWith(
        expect.objectContaining({ only: ['basket'] }),
      )
    })

    // The change adds the target variant and removes the old line, so the line
    // it landed on is the one the basket did not have before. The caller puts
    // keyboard focus back on it.
    it('names the line the change added', async () => {
      setBasket([current])
      reloadWith([line('line-2', 2, 9)])
      mocks.rpcChangeVariant.mockResolvedValueOnce(createSafeSuccess({}))
      const { changeItemVariant } = useBasket()

      const result = await changeItemVariant(current, 9)

      expect(result).toEqual({ success: true, itemKey: 'line-2' })
    })

    // The Storefront API answers an add of a variant a line already holds by
    // raising that line's quantity, so the change lands on a line that was
    // there all along.
    it('names the line the change merged into', async () => {
      setBasket([current, line('line-2', 1, 9)])
      reloadWith([line('line-2', 3, 9)])
      mocks.rpcChangeVariant.mockResolvedValueOnce(createSafeSuccess({}))
      const { changeItemVariant } = useBasket()

      const result = await changeItemVariant(current, 9)

      expect(result).toEqual({ success: true, itemKey: 'line-2' })
    })

    // A merge onto a line already at its stock cap adds no units, so no line
    // grows. The change still went through; only the focus target is unknown.
    it('names no line when the change grew none of them', async () => {
      setBasket([current, line('line-2', 3, 9)])
      reloadWith([line('line-2', 3, 9)])
      mocks.rpcChangeVariant.mockResolvedValueOnce(createSafeSuccess({}))
      const { changeItemVariant } = useBasket()

      const result = await changeItemVariant(current, 9)

      expect(result).toEqual({ success: true, itemKey: undefined })
    })

    it('shows a success toast when the size change succeeds', async () => {
      mocks.rpcChangeVariant.mockResolvedValueOnce(createSafeSuccess({}))
      const { changeItemVariant } = useBasket()

      await changeItemVariant(current, 9)

      expect(mocks.toastShow).toHaveBeenCalledWith(
        'basket.size_selector.notification.success',
        { type: 'SUCCESS' },
      )
    })

    it('says the line merged when the change lands on a line already in the basket', async () => {
      setBasket([current, line('line-2', 1, 9)])
      reloadWith([line('line-2', 3, 9)])
      mocks.rpcChangeVariant.mockResolvedValueOnce(createSafeSuccess({}))
      const { changeItemVariant } = useBasket()

      await changeItemVariant(current, 9)

      expect(mocks.toastShow).toHaveBeenCalledExactlyOnceWith(
        'basket.size_selector.notification.success_merged',
        { type: 'SUCCESS' },
      )
    })

    it('names the resulting quantity when the Storefront API capped it', async () => {
      mocks.rpcChangeVariant.mockResolvedValueOnce(
        createSafeSuccess({
          addedWithReducedQuantity: true,
          quantity: 1,
          requestedQuantity: 2,
        }),
      )
      const { changeItemVariant } = useBasket()

      const result = await changeItemVariant(current, 9)

      expect(result).toEqual({ success: true, itemKey: undefined })
      expect(mocks.toastShow).toHaveBeenCalledExactlyOnceWith(
        'basket.size_selector.notification.reduced_quantity',
        { type: 'INFO' },
      )
      expect(mocks.translate).toHaveBeenCalledWith(
        'basket.size_selector.notification.reduced_quantity',
        1,
      )
    })

    // The server reports no quantity when it could not read the basket back
    // after the change, and the basket reloaded a moment ago holds the units.
    it('counts the reloaded basket when the server reports no quantity', async () => {
      setBasket([line('line-2', 3, 9)])
      mocks.rpcChangeVariant.mockResolvedValueOnce(
        createSafeSuccess({
          addedWithReducedQuantity: true,
          requestedQuantity: 5,
        }),
      )
      const { changeItemVariant } = useBasket()

      await changeItemVariant(current, 9)

      expect(mocks.translate).toHaveBeenCalledWith(
        'basket.size_selector.notification.reduced_quantity',
        3,
      )
    })

    // The server keeps the add when the remove of the old line fails, and then
    // has no resulting quantity to report.
    it('says the previous size stayed when the old line is still in the reloaded basket', async () => {
      setBasket([current])
      reloadWith([current, line('line-2', 1, 9)])
      mocks.rpcChangeVariant.mockResolvedValueOnce(
        createSafeSuccess({
          addedWithReducedQuantity: true,
          requestedQuantity: 2,
        }),
      )
      const { changeItemVariant } = useBasket()

      await changeItemVariant(current, 9)

      expect(mocks.toastShow).toHaveBeenCalledExactlyOnceWith(
        'basket.size_selector.notification.previous_size_kept',
        { type: 'WARNING' },
      )
    })

    it('shows an error toast and tracks nothing when the change fails', async () => {
      mocks.rpcChangeVariant.mockResolvedValueOnce(
        createSafeFailure({ code: 'VARIANT_OUT_OF_STOCK' }, true),
      )
      const { changeItemVariant } = useBasket()

      const result = await changeItemVariant(current, 9)

      expect(result).toEqual({ success: false })
      expect(mocks.toastShow).toHaveBeenCalledWith(
        'basket.size_selector.notification.error',
        { type: 'ERROR' },
      )
      expect(mocks.trackRemoveFromBasket).not.toHaveBeenCalled()
      expect(mocks.trackAddToBasket).not.toHaveBeenCalled()
    })

    // A size change has no event of its own: it reports as the removal of the
    // old line followed by the add of the new variant, both on the basket
    // surface, with the same product and a different variant.
    it('reports the old line as removed and then the new variant as added', async () => {
      setBasket([current])
      reloadWith([line('line-2', 2, 9)])
      mocks.rpcChangeVariant.mockResolvedValueOnce(
        createSafeSuccess({ itemKey: 'line-2' }),
      )
      const { changeItemVariant } = useBasket()

      await changeItemVariant(current, 9)

      expect(mocks.trackRemoveFromBasket).toHaveBeenCalledWith(current)
      expect(mocks.trackAddToBasket).toHaveBeenCalledWith(
        { id: 9 },
        current.product,
        2,
        BASKET_SURFACE,
      )
      expect(
        mocks.trackRemoveFromBasket.mock.invocationCallOrder[0],
      ).toBeLessThan(mocks.trackAddToBasket.mock.invocationCallOrder[0]!)
    })

    it('reports the units the new variant gained when the Storefront API capped the change', async () => {
      setBasket([current])
      reloadWith([line('line-2', 1, 9)])
      mocks.rpcChangeVariant.mockResolvedValueOnce(
        createSafeSuccess({
          addedWithReducedQuantity: true,
          itemKey: 'line-2',
          quantity: 1,
          requestedQuantity: 2,
        }),
      )
      const { changeItemVariant } = useBasket()

      await changeItemVariant(current, 9)

      // The whole old line left the basket, only one unit of the new size fit.
      expect(mocks.trackRemoveFromBasket).toHaveBeenCalledWith(current)
      expect(mocks.trackAddToBasket).toHaveBeenCalledWith(
        { id: 9 },
        current.product,
        1,
        BASKET_SURFACE,
      )
    })

    // The server keeps the add when the remove of the old line fails, so the
    // basket then really holds both lines.
    it('reports no removal when the old line is still in the reloaded basket', async () => {
      setBasket([current])
      reloadWith([current, line('line-2', 2, 9)])
      mocks.rpcChangeVariant.mockResolvedValueOnce(createSafeSuccess({}))
      const { changeItemVariant } = useBasket()

      await changeItemVariant(current, 9)

      expect(mocks.trackRemoveFromBasket).not.toHaveBeenCalled()
      expect(mocks.trackAddToBasket).toHaveBeenCalledWith(
        { id: 9 },
        current.product,
        2,
        BASKET_SURFACE,
      )
    })
  })

  describe('removeItem', () => {
    it('removes the item, reloads the basket and reports success', async () => {
      mocks.rpcRemove.mockResolvedValueOnce(createSafeSuccess({}))
      const { removeItem } = useBasket()

      const result = await removeItem({ itemKey: 'line-1' })

      expect(mocks.rpcRemove).toHaveBeenCalledWith({ itemKey: 'line-1' })
      expect(mocks.routerReload).toHaveBeenCalledWith(
        expect.objectContaining({ only: ['basket'] }),
      )
      expect(result).toEqual({ success: true })
      expect(mocks.toastShow).toHaveBeenCalledWith(
        'add_to_basket.notification.remove_basket_item_success',
        { type: 'SUCCESS' },
      )
    })

    it('reports an error when the remove request fails', async () => {
      mocks.rpcRemove.mockResolvedValueOnce(
        createSafeFailure(new Error('failed')),
      )
      const { removeItem } = useBasket()

      const result = await removeItem({ itemKey: 'line-1' })

      expect(result).toEqual({ success: false })
      expect(mocks.toastShow).toHaveBeenCalledWith(
        'add_to_basket.notification.remove_basket_item_error',
        { type: 'ERROR' },
      )
    })

    it('reloads the basket even when the remove request failed', async () => {
      mocks.rpcRemove.mockResolvedValueOnce(
        createSafeFailure(new Error('failed')),
      )
      const { removeItem } = useBasket()

      await removeItem({ itemKey: 'line-1' })

      expect(mocks.routerReload).toHaveBeenCalledTimes(1)
    })
  })

  // A failed reload already showed the global error toast from `main.ts`. The
  // request itself may well have landed, so the mutation's own success or error
  // toast would be a second message, and an unconfirmed one. A failed request
  // shows no toast of its own either, so the user gets one toast in all cases.
  describe('when the basket reload fails', () => {
    const current = line('line-1', 2)
    const failure = () => createSafeFailure(new Error('failed'))

    const mutations = [
      {
        name: 'addItem',
        respond: (ok: boolean) =>
          mocks.rpcAdd.mockResolvedValueOnce(
            ok
              ? createSafeSuccess({ addedWithReducedQuantity: false })
              : failure(),
          ),
        run: () =>
          useBasket().addItem({ productName: 'X', variantId: 5, quantity: 1 }),
        failed: false,
      },
      {
        name: 'updateItemQuantity',
        respond: (ok: boolean) =>
          mocks.rpcUpdate.mockResolvedValueOnce(
            ok ? createSafeSuccess({}) : failure(),
          ),
        run: () => useBasket().updateItemQuantity(current, 3),
        failed: false,
      },
      {
        name: 'changeItemVariant',
        respond: (ok: boolean) =>
          mocks.rpcChangeVariant.mockResolvedValueOnce(
            ok ? createSafeSuccess({}) : failure(),
          ),
        run: () => useBasket().changeItemVariant(current, 9),
        failed: { success: false, reloadFailed: true },
      },
      {
        name: 'removeItem',
        respond: (ok: boolean) =>
          mocks.rpcRemove.mockResolvedValueOnce(
            ok ? createSafeSuccess({}) : failure(),
          ),
        run: () => useBasket().removeItem({ itemKey: current.key }),
        failed: { success: false, reloadFailed: true },
      },
    ]

    it.for(
      mutations.flatMap((mutation) => [
        { ...mutation, request: 'succeeded', ok: true },
        { ...mutation, request: 'failed', ok: false },
      ]),
    )(
      '$name resolves as failed with no toast, slide-in or tracking when its request $request',
      async ({ respond, ok, run, failed }) => {
        setBasket([current])
        respond(ok)
        failReload()

        expect(await run()).toEqual(failed)
        expect(mocks.toastShow).not.toHaveBeenCalled()
        expect(mocks.announce).not.toHaveBeenCalled()
        expect(useAddToBasketSlideIn().isOpen.value).toBe(false)
        expect(mocks.trackAddToBasket).not.toHaveBeenCalled()
        expect(mocks.trackRemoveFromBasket).not.toHaveBeenCalled()
      },
    )
  })
})
