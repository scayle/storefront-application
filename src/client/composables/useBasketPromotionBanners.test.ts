import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { CentAmount } from '@scayle/storefront-api'
import type { Basket, Promotion } from '@scayle/storefront/types'
import type { ReactivePageMock } from '@test/utils/inertia'
import { useBasketPromotionBanners } from './useBasketPromotionBanners'

const mocks = vi.hoisted(() => ({
  reactivePage: null as ReactivePageMock | null,
}))

const basketRef = ref<Basket | null | undefined>(undefined)

vi.mock('@inertiajs/vue3', async () => {
  const { createReactivePage } = await import('@test/utils/inertia')
  mocks.reactivePage = createReactivePage({ promotions: [] })
  return {
    usePage: vi.fn(() => mocks.reactivePage),
  }
})

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
    ...overrides,
  }
}

const comboDeal = buildPromotion({
  id: 'combo',
  product: { attributeGroupId: 5, attributeId: 42 },
  effect: { type: 'combo_deal', eligibleItemsQuantity: 2, value: '10' },
})

const tieredPromotion = buildPromotion({
  id: 'tiered',
  tiers: [
    {
      id: 1,
      name: 'Tier 1',
      mov: 5000 as CentAmount,
      effect: {
        type: 'automatic_discount',
        discountType: 'relative',
        value: '10',
      },
    },
  ],
})

function buildBasket(items: object[]): Basket {
  // A mapped basket line always carries a promotion list, even an empty one.
  const availableItems = items.map((item) => ({ promotions: [], ...item }))
  return { availableItems, unavailableItems: [] } as unknown as Basket
}

describe('useBasketPromotionBanners', () => {
  beforeEach(() => {
    basketRef.value = undefined
    mocks.reactivePage!.props.promotions = []
  })

  it('includes a combo deal that matches a basket product attribute', () => {
    mocks.reactivePage!.props.promotions = [comboDeal]
    basketRef.value = buildBasket([
      {
        product: { attributeValuesByGroup: { '5': [42] } },
        totalPrice: { appliedReductions: [] },
      },
    ])

    const { banners } = useBasketPromotionBanners(basketRef)

    expect(banners.value).toEqual([comboDeal])
  })

  it('includes a tiered promotion applied through a line reduction', () => {
    mocks.reactivePage!.props.promotions = [tieredPromotion]
    basketRef.value = buildBasket([
      {
        product: { attributeValuesByGroup: {} },
        totalPrice: {
          appliedReductions: [{ category: 'promotion', promotionId: 'tiered' }],
        },
      },
    ])

    const { banners } = useBasketPromotionBanners(basketRef)

    expect(banners.value).toEqual([tieredPromotion])
  })

  it('excludes a promotion that is neither applied nor matched by a basket product', () => {
    mocks.reactivePage!.props.promotions = [tieredPromotion, comboDeal]
    basketRef.value = buildBasket([
      {
        product: { attributeValuesByGroup: { '5': [99] } },
        totalPrice: { appliedReductions: [] },
      },
    ])

    const { banners } = useBasketPromotionBanners(basketRef)

    expect(banners.value).toEqual([])
  })

  it('is undefined while the promotions prop is unresolved', () => {
    mocks.reactivePage!.props.promotions = undefined
    basketRef.value = buildBasket([])

    const { banners } = useBasketPromotionBanners(basketRef)

    expect(banners.value).toBeUndefined()
  })

  it('is undefined while the basket is unresolved and fills in once it arrives', () => {
    mocks.reactivePage!.props.promotions = [comboDeal]

    const { banners } = useBasketPromotionBanners(basketRef)

    expect(banners.value).toBeUndefined()

    basketRef.value = buildBasket([
      {
        product: { attributeValuesByGroup: { '5': [42] } },
        totalPrice: { appliedReductions: [] },
      },
    ])

    expect(banners.value).toEqual([comboDeal])
  })

  it('is undefined while promotions are unresolved and fills in once they arrive', () => {
    mocks.reactivePage!.props.promotions = undefined
    basketRef.value = buildBasket([
      {
        product: { attributeValuesByGroup: { '5': [42] } },
        totalPrice: { appliedReductions: [] },
      },
    ])

    const { banners } = useBasketPromotionBanners(basketRef)

    expect(banners.value).toBeUndefined()

    mocks.reactivePage!.props.promotions = [comboDeal]

    expect(banners.value).toEqual([comboDeal])
  })

  it('is undefined when the basket fetch failed (null)', () => {
    mocks.reactivePage!.props.promotions = [comboDeal]
    basketRef.value = null

    const { banners } = useBasketPromotionBanners(basketRef)

    expect(banners.value).toBeUndefined()
  })

  it('excludes every promotion when the basket has no available items', () => {
    mocks.reactivePage!.props.promotions = [comboDeal, tieredPromotion]
    basketRef.value = buildBasket([])

    const { banners } = useBasketPromotionBanners(basketRef)

    expect(banners.value).toEqual([])
  })

  it('includes a promotion carrying both tiers and a combo deal effect once', () => {
    const tieredComboDeal = buildPromotion({
      id: 'tiered-combo',
      tiers: tieredPromotion.tiers,
      effect: { type: 'combo_deal', eligibleItemsQuantity: 2, value: '10' },
    })
    mocks.reactivePage!.props.promotions = [tieredComboDeal]
    basketRef.value = buildBasket([
      {
        product: { attributeValuesByGroup: {} },
        totalPrice: {
          appliedReductions: [
            { category: 'promotion', promotionId: 'tiered-combo' },
          ],
        },
      },
    ])

    const { banners } = useBasketPromotionBanners(basketRef)

    expect(banners.value).toEqual([tieredComboDeal])
  })
})
