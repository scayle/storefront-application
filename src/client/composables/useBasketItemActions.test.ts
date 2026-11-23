import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BasketItem } from '@scayle/storefront/types'
import type { ChangeItemVariantResult } from '@client/composables/useBasket'
import { ANNOUNCE_DEBOUNCE_MS } from '@client/composables/useAnnouncer'
import { useBasketItemActions } from './useBasketItemActions'

const mocks = vi.hoisted(() => ({
  updateItemQuantity: vi.fn(),
  changeItemVariant: vi.fn(),
  removeItem: vi.fn(),
  trackAddToBasket: vi.fn(),
  trackRemoveFromBasket: vi.fn(),
  announce: vi.fn(),
}))

vi.mock('@client/composables/useBasket', () => ({
  useBasket: () => ({
    updateItemQuantity: mocks.updateItemQuantity,
    changeItemVariant: mocks.changeItemVariant,
    removeItem: mocks.removeItem,
  }),
}))

vi.mock('@client/composables/tracking/useBasketEvents', () => ({
  useBasketEvents: () => ({
    trackAddToBasket: mocks.trackAddToBasket,
    trackRemoveFromBasket: mocks.trackRemoveFromBasket,
  }),
}))

vi.mock('@client/composables/useAnnouncer', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@client/composables/useAnnouncer')
  >()),
  useAnnouncer: () => ({ announce: mocks.announce }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, named?: Record<string, unknown>) =>
      named ? `${key}:${JSON.stringify(named)}` : key,
  }),
}))

const shirt = {
  key: 'shirt',
  product: { name: 'Shirt' },
  variants: [{ id: 11, label: 'M' }],
} as unknown as BasketItem

const trousers = {
  key: 'trousers',
  product: { name: 'Trousers' },
  variants: [{ id: 999, label: 'L' }],
} as unknown as BasketItem

function setup() {
  const restoreFocusAfterRemoval = vi.fn()
  const restoreFocusAfterVariantChange = vi.fn()
  return {
    ...useBasketItemActions({
      renderedItems: [shirt, trousers],
      restoreFocusAfterRemoval,
      restoreFocusAfterVariantChange,
    }),
    restoreFocusAfterRemoval,
    restoreFocusAfterVariantChange,
  }
}

/** Opens the removal confirmation for `itemKey` and accepts it. */
async function removeConfirmed(
  actions: ReturnType<typeof setup>,
  itemKey: string,
) {
  const removal = actions.requestRemoval(itemKey)
  actions.confirmRemoval()
  await removal
}

beforeEach(() => {
  mocks.updateItemQuantity.mockResolvedValue(true)
  mocks.changeItemVariant.mockResolvedValue({ success: true })
  mocks.removeItem.mockResolvedValue({ success: true })
})

describe('useBasketItemActions', () => {
  describe('updateQuantity', () => {
    it('marks the item as loading while the update is in flight', () => {
      mocks.updateItemQuantity.mockReturnValue(new Promise(() => {}))
      const { updateQuantity, loadingItems } = setup()

      void updateQuantity(shirt, 2)

      expect(loadingItems.value.get('shirt')).toBe(true)
    })

    it('announces the new quantity politely and clears the loading state', async () => {
      const { updateQuantity, loadingItems } = setup()

      await updateQuantity(shirt, 2)

      expect(mocks.announce).toHaveBeenCalledWith(
        'basket.a11y.quantity_changed:{"name":"Shirt","count":2}',
        { debounce: undefined },
      )
      expect(loadingItems.value.has('shirt')).toBe(false)
    })

    // A customer clicking quantity-up several times would otherwise hear every
    // step read out.
    it('debounces a repeat of the same announcement', async () => {
      const { updateQuantity } = setup()

      await updateQuantity(shirt, 2)
      await updateQuantity(shirt, 2)

      expect(mocks.announce).toHaveBeenLastCalledWith(
        'basket.a11y.quantity_changed:{"name":"Shirt","count":2}',
        { debounce: ANNOUNCE_DEBOUNCE_MS },
      )
    })

    it('releases the item without an announcement when the update fails', async () => {
      mocks.updateItemQuantity.mockResolvedValue(false)
      const { updateQuantity, loadingItems } = setup()

      await updateQuantity(shirt, 2)

      expect(loadingItems.value.get('shirt')).toBe(false)
      expect(mocks.announce).not.toHaveBeenCalled()
    })

    // `useBasket().updateItemQuantity` fires add_to_basket and
    // remove_from_basket itself; a second call here would double the event.
    it('fires no basket event itself', async () => {
      const { updateQuantity } = setup()

      await updateQuantity(shirt, 2)

      expect(mocks.trackAddToBasket).not.toHaveBeenCalled()
      expect(mocks.trackRemoveFromBasket).not.toHaveBeenCalled()
    })
  })

  describe('changeVariant', () => {
    it('marks the item as loading while the change is in flight', () => {
      mocks.changeItemVariant.mockReturnValue(
        new Promise<ChangeItemVariantResult>(() => {}),
      )
      const { changeVariant, loadingItems } = setup()

      void changeVariant(trousers, 999)

      expect(loadingItems.value.get('trousers')).toBe(true)
    })

    it('announces the new size politely and clears the loading state', async () => {
      const { changeVariant, loadingItems } = setup()

      await changeVariant(trousers, 999)

      expect(mocks.announce).toHaveBeenCalledWith(
        'basket.a11y.size_changed:{"name":"Trousers","size":"L"}',
        { debounce: undefined },
      )
      expect(loadingItems.value.has('trousers')).toBe(false)
    })

    it('restores focus to the line the server names, from the old position', async () => {
      mocks.changeItemVariant.mockResolvedValue({
        success: true,
        itemKey: 'replacement-key',
      })
      const { changeVariant, restoreFocusAfterVariantChange } = setup()

      await changeVariant(trousers, 999)

      expect(restoreFocusAfterVariantChange).toHaveBeenCalledExactlyOnceWith(
        'replacement-key',
        1,
      )
    })

    // A size change is the one basket mutation whose only visible feedback is
    // the line re-rendering, so a failure has to reach the assertive region,
    // and the card has to come back out of its loading state.
    it('announces a failed change assertively and releases the item', async () => {
      mocks.changeItemVariant.mockResolvedValue({ success: false })
      const { changeVariant, loadingItems } = setup()

      await changeVariant(trousers, 999)

      expect(mocks.announce).toHaveBeenCalledWith(
        'basket.a11y.size_change_failed:{"name":"Trousers"}',
        { politeness: 'assertive' },
      )
      expect(loadingItems.value.get('trousers')).toBe(false)
    })

    // The global error toast already reported the failed reload, and the
    // change may well have landed, so "please try again" would be wrong.
    it('announces nothing after a failed basket reload and releases the item', async () => {
      mocks.changeItemVariant.mockResolvedValue({
        success: false,
        reloadFailed: true,
      })
      const { changeVariant, loadingItems } = setup()

      await changeVariant(trousers, 999)

      expect(mocks.announce).not.toHaveBeenCalled()
      expect(loadingItems.value.get('trousers')).toBe(false)
    })

    // A failed change leaves the line in place, so the picker the customer
    // used is still mounted and keeps focus.
    it('leaves focus alone after a failed change', async () => {
      mocks.changeItemVariant.mockResolvedValue({ success: false })
      const { changeVariant, restoreFocusAfterVariantChange } = setup()

      await changeVariant(trousers, 999)

      expect(restoreFocusAfterVariantChange).not.toHaveBeenCalled()
    })
  })

  describe('requestRemoval', () => {
    it('removes nothing when the customer cancels', async () => {
      const actions = setup()

      const removal = actions.requestRemoval('trousers')
      actions.cancelRemoval()
      await removal

      expect(mocks.removeItem).not.toHaveBeenCalled()
    })

    it('removes the item once the customer confirms', async () => {
      const actions = setup()

      await removeConfirmed(actions, 'trousers')

      expect(mocks.removeItem).toHaveBeenCalledExactlyOnceWith({
        itemKey: 'trousers',
      })
    })

    it('fires remove_from_basket once after a confirmed removal', async () => {
      const actions = setup()

      await removeConfirmed(actions, 'trousers')

      expect(mocks.trackRemoveFromBasket).toHaveBeenCalledExactlyOnceWith(
        trousers,
      )
    })

    it('announces the removal politely and clears the loading state', async () => {
      const actions = setup()

      await removeConfirmed(actions, 'trousers')

      expect(mocks.announce).toHaveBeenCalledWith(
        'basket.a11y.item_removed:{"name":"Trousers"}',
        { debounce: undefined },
      )
      expect(actions.loadingItems.value.has('trousers')).toBe(false)
    })

    it('restores focus from the position the removed item held', async () => {
      const actions = setup()

      await removeConfirmed(actions, 'trousers')

      expect(actions.restoreFocusAfterRemoval).toHaveBeenCalledExactlyOnceWith(
        1,
      )
    })

    it('announces a failed removal assertively and releases the item', async () => {
      mocks.removeItem.mockResolvedValue({ success: false })
      const actions = setup()

      await removeConfirmed(actions, 'trousers')

      expect(mocks.announce).toHaveBeenCalledWith(
        'basket.a11y.remove_failed:{"name":"Trousers"}',
        { politeness: 'assertive' },
      )
      expect(actions.loadingItems.value.get('trousers')).toBe(false)
    })

    it('announces nothing after a failed basket reload and releases the item', async () => {
      mocks.removeItem.mockResolvedValue({ success: false, reloadFailed: true })
      const actions = setup()

      await removeConfirmed(actions, 'trousers')

      expect(mocks.announce).not.toHaveBeenCalled()
      expect(actions.loadingItems.value.get('trousers')).toBe(false)
    })

    // A remove event for a removal that did not happen would count a basket
    // change the customer never made.
    it('fires no remove_from_basket when the removal fails', async () => {
      mocks.removeItem.mockResolvedValue({ success: false })
      const actions = setup()

      await removeConfirmed(actions, 'trousers')

      expect(mocks.trackRemoveFromBasket).not.toHaveBeenCalled()
    })
  })
})
