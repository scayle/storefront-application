import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Ref } from 'vue'
import type {
  Basket,
  DetailedProduct,
  Promotion,
} from '@scayle/storefront/types'
import type { ReactivePageMock } from '@test/utils/inertia'
import { useProductPromotions } from './useProductPromotions'

const mocks = vi.hoisted(() => ({
  reactivePage: null as ReactivePageMock | null,
  basketRef: null as Ref<Basket | undefined> | null,
}))

vi.mock('@client/composables/useBasket', async () => {
  const { ref: vueRef } = await import('vue')
  mocks.basketRef = vueRef<Basket | undefined>(undefined)
  // Same semantics as the real `useBasket().isPromotionAppliedForProduct`,
  // which reads the promotion reductions applied to the item's total price.
  const isPromotionAppliedForProduct = (
    promotion: Promotion,
    productId: number,
  ) =>
    mocks.basketRef!.value?.availableItems.some(
      (item) =>
        item.product.id === productId &&
        item.totalPrice.appliedReductions.some(
          (reduction) =>
            reduction.category === 'promotion' &&
            reduction.promotionId === promotion.id,
        ),
    ) ?? false
  return {
    useBasket: () => ({
      basket: mocks.basketRef,
      isPromotionAppliedForProduct,
    }),
  }
})

vi.mock('@inertiajs/vue3', async () => {
  const { createReactivePage } = await import('@test/utils/inertia')
  mocks.reactivePage = createReactivePage({ promotions: [] })
  return {
    usePage: vi.fn(() => mocks.reactivePage),
  }
})

const productOnSale = {
  id: 1,
  attributeValuesByGroup: { '5': [42] },
} as unknown as DetailedProduct

function buildPromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'promo-1',
    name: 'Test',
    priority: 0,
    headline: '',
    link: '',
    hideCountdown: false,
    conditions: '',
    color: { backgroundColor: '#000', color: '#fff' },
    schedule: { from: '', to: '' },
    product: { attributeGroupId: 5, attributeId: 42 },
    ...overrides,
  }
}

describe('useProductPromotions', () => {
  beforeEach(() => {
    mocks.basketRef!.value = undefined
    mocks.reactivePage!.props.promotions = []
  })

  it('filters promotions by product attribute match', () => {
    const matching = buildPromotion({ id: 'a' })
    const nonMatching = buildPromotion({
      id: 'b',
      product: { attributeGroupId: 5, attributeId: 99 },
    })
    mocks.reactivePage!.props.promotions = [matching, nonMatching]

    const { promotions } = useProductPromotions(() => productOnSale)

    expect(promotions.value).toEqual([matching])
  })

  it('hasAppliedPromotion is false while basket is undefined', () => {
    mocks.reactivePage!.props.promotions = [buildPromotion()]

    const { hasAppliedPromotion } = useProductPromotions(() => productOnSale)

    expect(hasAppliedPromotion.value).toBe(false)
  })

  it('hasAppliedPromotion is true when a basket item price carries the promotion reduction', () => {
    mocks.reactivePage!.props.promotions = [buildPromotion()]
    mocks.basketRef!.value = {
      availableItems: [
        {
          product: { id: 1 },
          totalPrice: {
            appliedReductions: [
              { category: 'promotion', promotionId: 'promo-1' },
            ],
          },
        },
      ],
    } as unknown as Basket

    const { hasAppliedPromotion } = useProductPromotions(() => productOnSale)

    expect(hasAppliedPromotion.value).toBe(true)
  })

  it('returns empty list and false when product has no matching attributes', () => {
    mocks.reactivePage!.props.promotions = [buildPromotion()]
    const productWithoutMatch = {
      id: 2,
      attributeValuesByGroup: { '5': [11] },
    } as unknown as DetailedProduct

    const { promotions, hasAppliedPromotion } =
      useProductPromotions(productWithoutMatch)

    expect(promotions.value).toEqual([])
    expect(hasAppliedPromotion.value).toBe(false)
  })

  it('returns undefined while the deferred promotions prop is unresolved', () => {
    mocks.reactivePage!.props.promotions = undefined

    const { promotions, hasAppliedPromotion } = useProductPromotions(
      () => productOnSale,
    )

    expect(promotions.value).toBeUndefined()
    expect(hasAppliedPromotion.value).toBe(false)
  })
})
