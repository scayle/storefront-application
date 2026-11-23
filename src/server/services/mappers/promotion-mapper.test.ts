import { describe, it, expect } from 'vitest'
import type {
  Promotion as StorefrontAPIPromotion,
  CentAmount,
} from '@scayle/storefront-api'
import { PromotionMapper } from '@scayle/storefront/mappers'
import { createApiPromotion } from '@scayle/storefront/test'
import { createMockStorefrontContext } from '../../../test/utils/context'
import { PromotionMapperService } from './promotion-mapper'

const automaticDiscountEffect = {
  type: 'automatic_discount',
  additionalData: { type: 'relative', value: 10 },
} as const satisfies StorefrontAPIPromotion['effect']

const mappedAutomaticDiscountEffect = {
  type: 'automatic_discount',
  discountType: 'relative',
  value: '-10%',
  isFree: false,
}

describe('PromotionMapperService', () => {
  const context = createMockStorefrontContext()
  const mapper = new PromotionMapperService(context)

  describe('mapPromotion', () => {
    it('keeps the base mapping of the tenant-invariant fields', () => {
      const promotion = createApiPromotion()

      expect(mapper.mapPromotion(promotion)).toMatchObject(
        new PromotionMapper(context).mapPromotion(promotion),
      )
    })

    it('uses displayName as headline when available', () => {
      const promotion = createApiPromotion({
        displayName: 'Display Name',
        name: 'Internal Name',
      })
      expect(mapper.mapPromotion(promotion).headline).toBe('Display Name')
    })

    it.for([undefined, ''])(
      'falls back to name as headline when displayName is %j',
      (displayName) => {
        const promotion = createApiPromotion({
          displayName,
          name: 'Summer Sale',
        })
        expect(mapper.mapPromotion(promotion).headline).toBe('Summer Sale')
      },
    )

    it('maps customData fields to promotion properties', () => {
      const promotion = createApiPromotion({
        customData: {
          subline: 'Up to 50% off',
          link: '/summer',
          hideCountdown: true,
          conditions: 'Applies to selected items',
          highlightProductCards: true,
        },
      })
      expect(mapper.mapPromotion(promotion)).toMatchObject({
        subline: 'Up to 50% off',
        link: '/summer',
        hideCountdown: true,
        conditions: 'Applies to selected items',
        highlightProductCards: true,
      })
    })

    it('builds a single tier from a minimum order value when the promotion has no tiers', () => {
      const promotion = createApiPromotion({
        effect: automaticDiscountEffect,
        customData: { minimumOrderValue: 10000 as CentAmount },
      })

      expect(mapper.mapPromotion(promotion).tiers).toEqual([
        {
          id: 0,
          name: 'Summer Sale',
          mov: 10000,
          effect: mappedAutomaticDiscountEffect,
        },
      ])
    })

    it('keeps the API tiers and ignores a stray minimum order value', () => {
      const promotion = createApiPromotion({
        effect: automaticDiscountEffect,
        tiers: [
          {
            id: 7,
            name: 'Tier 1',
            mov: 5000 as CentAmount,
            effect: automaticDiscountEffect,
          },
        ],
        customData: { minimumOrderValue: 10000 as CentAmount },
      })

      expect(mapper.mapPromotion(promotion).tiers).toEqual([
        {
          id: 7,
          name: 'Tier 1',
          mov: 5000,
          effect: mappedAutomaticDiscountEffect,
        },
      ])
    })

    it('builds no tier when the promotion has a minimum order value but no effect', () => {
      const promotion = createApiPromotion({
        effect: undefined,
        customData: { minimumOrderValue: 10000 as CentAmount },
      })

      expect(mapper.mapPromotion(promotion).tiers).toBeUndefined()
    })

    it('falls back to the defaults when customData is empty', () => {
      const promotion = createApiPromotion({ customData: {} })

      expect(mapper.mapPromotion(promotion)).toMatchObject({
        link: '',
        hideCountdown: false,
        conditions: '',
        highlightProductCards: false,
        color: {
          backgroundColor: 'var(--color-promotion)',
          color: 'var(--color-primary)',
        },
        product: undefined,
      })
    })

    it('maps color from customData when present', () => {
      const promotion = createApiPromotion({
        customData: { color: { background: '#ff0000', text: '#ffffff' } },
      })
      const result = mapper.mapPromotion(promotion)

      expect(result.color.backgroundColor).toBe('#ff0000')
      expect(result.color.color).toBe('#ffffff')
    })

    it('maps product config from customData when present', () => {
      const promotion = createApiPromotion({
        customData: {
          product: {
            attributeId: 10,
            attributeGroupId: 20,
            badgeLabel: 'Sale',
          },
        },
      })
      const result = mapper.mapPromotion(promotion)

      expect(result.product).toEqual({
        attributeId: 10,
        attributeGroupId: 20,
        badgeLabel: 'Sale',
      })
    })
  })

  describe('mapPromotionForSummary', () => {
    it('maps the summary subset (id, name, headline, color)', () => {
      const promotion = createApiPromotion({
        customData: { color: { background: '#ff0000', text: '#ffffff' } },
      })
      const result = mapper.mapPromotionForSummary(promotion)

      expect(result).toEqual({
        id: 'promo-1',
        name: 'Summer Sale',
        headline: 'Summer Sale Display',
        color: { backgroundColor: '#ff0000', color: '#ffffff' },
      })
    })

    it.for([undefined, ''])(
      'falls back to the name as headline and to theme variables as color when displayName is %j',
      (displayName) => {
        const promotion = createApiPromotion({
          displayName,
          customData: {},
        })

        expect(mapper.mapPromotionForSummary(promotion)).toMatchObject({
          headline: 'Summer Sale',
          color: {
            backgroundColor: 'var(--color-promotion)',
            color: 'var(--color-primary)',
          },
        })
      },
    )
  })
})
