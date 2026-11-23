import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { CentAmount } from '@scayle/storefront-api'
import type { PromotionReduction } from '@shared/types/Basket'
import type { Basket, Promotion } from '@scayle/storefront/types'
import type { StorefrontCountry } from '@scayle/storefront/config'
import { formatCurrency } from '@shared/utils/formatter'
import { createMockBasket, createMockBasketItem } from '@test/mock-data/basket'
import {
  createMockPromotion,
  createMockTieredPromotion,
} from '@test/mock-data/promotions'
import { useMOVPromotions } from './useMOVPromotions'

const country: StorefrontCountry = {
  name: 'Germany',
  locale: 'de-DE',
  currency: { currencyCode: 'EUR' },
  countryCode: 'DE',
  shopCountryId: 1,
  domain: 'example.com',
  path: '/de',
  checkout: {
    token: 'test',
    secret: 'test',
    user: 'test',
  },
}

const mockBasketRef = ref<Basket | undefined>(undefined)

vi.mock('@client/composables/useBasket', () => ({
  useBasket: () => ({ basket: mockBasketRef }),
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: { storefront: { country } },
  }),
}))

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

/**
 * Builds a basket whose items carry `itemPromotions`, one item per entry. Only
 * the cost fields `useMOVPromotions` reads are set.
 */
function createBasket({
  totalWithoutPromotionsInCents = 0,
  promotionReductionsPerPromotion = [],
  itemPromotions = [],
}: {
  totalWithoutPromotionsInCents?: number
  promotionReductionsPerPromotion?: PromotionReduction[]
  itemPromotions?: Promotion[][]
} = {}): Basket {
  const basket = createMockBasket({
    availableItems: itemPromotions.map((promotions, index) =>
      createMockBasketItem({ key: `item-${index}`, promotions }),
    ),
  })
  return {
    ...basket,
    cost: {
      ...basket.cost,
      totalWithoutPromotionsInCents,
      promotionReductionsPerPromotion,
    },
  }
}

describe('useMOVPromotions', () => {
  // The thresholds the assertions divide by and subtract from.
  const promotion = createMockTieredPromotion({
    id: '3',
    tiers: [
      {
        id: 1,
        name: 'Tier 1',
        mov: 5000 as CentAmount,
        effect: {
          type: 'automatic_discount',
          discountType: 'relative',
          value: '-10%',
          isFree: false,
        },
      },
      {
        id: 2,
        name: 'Tier 2',
        mov: 10000 as CentAmount,
        effect: {
          type: 'automatic_discount',
          discountType: 'relative',
          value: '-15%',
          isFree: false,
        },
      },
      {
        id: 3,
        name: 'Tier 3',
        mov: 15000 as CentAmount,
        effect: {
          type: 'automatic_discount',
          discountType: 'relative',
          value: '-20%',
          isFree: false,
        },
      },
    ],
  })

  beforeEach(() => {
    mockBasketRef.value = undefined
  })

  describe('basketTotal and progress', () => {
    it.for([
      { label: 'an absent basket', total: undefined, expected: 0 },
      { label: 'a basket below the highest tier', total: 7500, expected: 0.5 },
      { label: 'a basket past the highest tier', total: 20000, expected: 1 },
    ])(
      'scales the progress by the basket total for $label',
      ({ total, expected }) => {
        mockBasketRef.value =
          total === undefined
            ? undefined
            : createBasket({ totalWithoutPromotionsInCents: total })
        const { progress } = useMOVPromotions(promotion)

        expect(progress.value).toBe(expected)
      },
    )
  })

  describe('tiers and remaining', () => {
    it('computes remaining MOV to first tier when basket is empty', () => {
      mockBasketRef.value = createBasket({ totalWithoutPromotionsInCents: 0 })
      const { remaining, tiers } = useMOVPromotions(promotion)

      expect(remaining.value).toBe(5000)
      expect(tiers.value[0]!.remaining).toBe(5000)
      expect(tiers.value[0]!.progress).toBe(0)
    })

    it('computes remaining to next tier when first tier is reached', () => {
      mockBasketRef.value = createBasket({
        totalWithoutPromotionsInCents: 6000,
      })
      const { remaining, tiers } = useMOVPromotions(promotion)

      expect(remaining.value).toBe(4000)
      expect(tiers.value[0]!.progress).toBe(1)
      expect(tiers.value[1]!.progress).toBeCloseTo(0.6)
    })

    it('sets remaining to 0 when all tiers are reached', () => {
      mockBasketRef.value = createBasket({
        totalWithoutPromotionsInCents: 15000,
      })
      const { remaining, complete } = useMOVPromotions(promotion)

      expect(remaining.value).toBe(0)
      expect(complete.value).toBe(true)
    })

    // A promotion configured with only a minimum order value is mapped to a
    // single synthetic tier, so it drives the progress bar like a tiered one.
    it('computes remaining for a single-tier minimum order value promotion', () => {
      const movPromotion = createMockTieredPromotion({
        tiers: [
          {
            id: 0,
            name: 'Summer Sale',
            mov: 5000 as CentAmount,
            effect: {
              type: 'automatic_discount',
              discountType: 'relative',
              value: '-10%',
            },
          },
        ],
      })
      mockBasketRef.value = createBasket({
        totalWithoutPromotionsInCents: 2000,
      })
      const { remaining, progress, complete } = useMOVPromotions(movPromotion)

      expect(remaining.value).toBe(3000)
      expect(progress.value).toBeCloseTo(0.4)
      expect(complete.value).toBe(false)
    })
  })

  describe('discount', () => {
    it('returns undefined when no reduction matches promotion id', () => {
      mockBasketRef.value = createBasket({
        totalWithoutPromotionsInCents: 10000,
        promotionReductionsPerPromotion: [
          {
            id: '1',
            name: 'Tiered',
            headline: 'Tiered',
            color: { backgroundColor: '#222', color: '#fff' },
            total: '$5.00',
            totalInCents: 500,
          },
        ],
      })
      const { discount } = useMOVPromotions(promotion)

      expect(discount.value).toBeUndefined()
    })

    it('returns amount when cost has reduction for this promotion', () => {
      mockBasketRef.value = createBasket({
        totalWithoutPromotionsInCents: 10000,
        promotionReductionsPerPromotion: [
          {
            id: '3',
            name: 'Tiered',
            headline: 'Tiered',
            color: { backgroundColor: '#222', color: '#fff' },
            total: '$15.00',
            totalInCents: 1500,
          },
        ],
      })
      const { discount } = useMOVPromotions(promotion)

      expect(discount.value).toBe('$15.00')
    })
  })

  describe('isPromotionApplied', () => {
    it.for([
      {
        label: 'no basket item carries this promotion',
        itemPromotions: [[]],
        expected: false,
      },
      {
        label: 'a basket item carries this promotion',
        itemPromotions: [[createMockPromotion({ id: '3' })]],
        expected: true,
      },
      {
        label: 'the basket has no items',
        itemPromotions: [],
        expected: false,
      },
    ])('is $expected when $label', ({ itemPromotions, expected }) => {
      mockBasketRef.value = createBasket({
        totalWithoutPromotionsInCents: 10000,
        itemPromotions,
      })
      const { isPromotionApplied } = useMOVPromotions(promotion)

      expect(isPromotionApplied.value).toBe(expected)
    })
  })

  describe('milestones', () => {
    it('labels each milestone with the tier minimum and the tier effect', () => {
      mockBasketRef.value = createBasket({ totalWithoutPromotionsInCents: 0 })
      const { milestones } = useMOVPromotions(promotion)

      expect(milestones.value).toHaveLength(3)
      // The title prices the tier's own minimum order value for the storefront
      // country with no fraction digits; the rendered string itself is what
      // `formatCurrency` produces.
      expect(milestones.value[0]!.title).toBe(
        formatCurrency(5000, country, { currencyFractionDigits: 0 }),
      )
      expect(milestones.value[0]).toMatchObject({
        percent: 5000 / 15000,
        subtitle: '-10%',
      })
      expect(milestones.value[2]!.subtitle).toBe('-20%')
    })
  })

  describe('promotion without a spend target', () => {
    // `maxMov` is the highest tier's `mov`, so a tier list whose last `mov` is
    // 0 leaves nothing to divide by. `SFDealBanner` gates the progress wrapper
    // on `isTieredPromotion(deal)`, which only needs one tier, so this
    // promotion does reach the composable.
    const zeroMovTiers = createMockTieredPromotion({
      tiers: [
        {
          id: 1,
          name: 'Tier 1',
          mov: 0 as CentAmount,
          effect: {
            type: 'automatic_discount',
            discountType: 'relative',
            value: '-10%',
            isFree: false,
          },
        },
      ],
    })

    it.for([
      { label: 'an empty basket', total: 0 },
      { label: 'a non-empty basket', total: 7500 },
    ])(
      'reports no progress instead of NaN or Infinity for $label',
      ({ total }) => {
        mockBasketRef.value = createBasket({
          totalWithoutPromotionsInCents: total,
        })
        const { progress, complete } = useMOVPromotions(zeroMovTiers)

        expect(progress.value).toBe(0)
        expect(complete.value).toBe(false)
      },
    )

    it('places the milestone at 0 percent instead of NaN', () => {
      mockBasketRef.value = createBasket({
        totalWithoutPromotionsInCents: 7500,
      })
      const { tiers, milestones } = useMOVPromotions(zeroMovTiers)

      expect(tiers.value[0]!.percent).toBe(0)
      expect(milestones.value[0]!.percent).toBe(0)
    })
  })

  describe('promotion without tiers', () => {
    // `tiers: []` is a valid `PromotionTier[]`, so a caller outside
    // `SFDealBanner` can send it; the composable reports an empty state for it
    // instead of crashing on `.at(-1)!.mov`.
    const emptyTiers = createMockTieredPromotion({ tiers: [] })

    it('reports no tiers, no milestones and nothing remaining', () => {
      mockBasketRef.value = createBasket({
        totalWithoutPromotionsInCents: 7500,
      })
      const { progress, tiers, milestones, remaining, complete } =
        useMOVPromotions(emptyTiers)

      expect(progress.value).toBe(0)
      expect(complete.value).toBe(false)
      expect(tiers.value).toEqual([])
      expect(milestones.value).toEqual([])
      expect(remaining.value).toBe(0)
    })
  })
})
