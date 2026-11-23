import { describe, expect, it, vi } from 'vitest'
import type { BasketItem } from '@scayle/storefront/types'
import { useBasketItemFocus } from './useBasketItemFocus'

const item = (key: string) => ({ key }) as unknown as BasketItem

/** A card stand-in whose size selector takes focus unless told otherwise. */
const card = ({ hasVariantSelector = true } = {}) => ({
  focus: vi.fn(),
  focusVariantSelector: vi.fn(() => hasVariantSelector),
})

/** Builds the composable over `keys` with a card registered for each one. */
function setup(keys: string[], emptyBasket?: { $el: HTMLElement }) {
  const focus = useBasketItemFocus(keys.map(item), emptyBasket)
  const cards = Object.fromEntries(keys.map((key) => [key, card()]))
  for (const [key, entry] of Object.entries(cards)) {
    focus.setCardRef(key, entry)
  }
  return { ...focus, cards }
}

describe('useBasketItemFocus', () => {
  describe('restoreFocusAfterRemoval', () => {
    it.for([
      { case: 'the card now in the removed slot', removedIndex: 0 },
      { case: 'the new last card after the last one went', removedIndex: 2 },
    ])('focuses $case', ({ removedIndex }) => {
      const { restoreFocusAfterRemoval, cards } = setup(['first', 'second'])

      restoreFocusAfterRemoval(removedIndex)

      const expectedKey = removedIndex === 0 ? 'first' : 'second'
      expect(cards[expectedKey]!.focus).toHaveBeenCalledOnce()
    })

    it('focuses the first link of the empty basket once the last item is gone', () => {
      const el = document.createElement('div')
      el.innerHTML = '<p>Empty</p><a href="/">Continue</a>'
      document.body.append(el)
      const { restoreFocusAfterRemoval } = setup([], { $el: el })

      restoreFocusAfterRemoval(0)

      expect(document.activeElement).toBe(el.querySelector('a'))
      el.remove()
    })

    it('skips a card that has unmounted', () => {
      const { restoreFocusAfterRemoval, setCardRef, cards } = setup(['only'])
      setCardRef('only', null)

      restoreFocusAfterRemoval(0)

      expect(cards.only!.focus).not.toHaveBeenCalled()
    })
  })

  describe('restoreFocusAfterVariantChange', () => {
    it('focuses the size selector of the line the server names', () => {
      const { restoreFocusAfterVariantChange, cards } = setup([
        'unrelated-line',
        'replacement-key',
      ])

      restoreFocusAfterVariantChange('replacement-key', 0)

      expect(
        cards['replacement-key']!.focusVariantSelector,
      ).toHaveBeenCalledOnce()
      expect(cards['unrelated-line']!.focus).not.toHaveBeenCalled()
    })

    // Leaving focus on the document body is the state this restoration
    // repairs, so a line without a selector (a subscription) takes the target
    // a removal would have picked.
    it('falls back to the removal target when the named line has no size selector', () => {
      const focus = useBasketItemFocus([item('replacement-key')], undefined)
      const subscription = card({ hasVariantSelector: false })
      focus.setCardRef('replacement-key', subscription)

      focus.restoreFocusAfterVariantChange('replacement-key', 0)

      expect(subscription.focus).toHaveBeenCalledOnce()
    })

    // The server names no line when it could not read the basket back after
    // the change. The change still went through, so the card the customer
    // used is gone either way.
    it('falls back to the removal target when the server names no line', () => {
      const { restoreFocusAfterVariantChange, cards } = setup([
        'first',
        'second',
      ])

      restoreFocusAfterVariantChange(undefined, 1)

      expect(cards.second!.focus).toHaveBeenCalledOnce()
    })

    // Committing a size with Tab moves focus on before the response arrives.
    // Pulling it back would undo the customer's own move.
    it('leaves focus alone when the customer moved it during the change', () => {
      const movedTo = document.createElement('button')
      document.body.append(movedTo)
      movedTo.focus()
      const { restoreFocusAfterVariantChange, cards } = setup([
        'replacement-key',
      ])

      restoreFocusAfterVariantChange('replacement-key', 0)

      expect(
        cards['replacement-key']!.focusVariantSelector,
      ).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(movedTo)
      movedTo.remove()
    })
  })
})
