import { describe, expect, it } from 'vitest'
import type { CentAmount, RFC3339Date } from '@scayle/storefront-api'
import {
  createApiCampaign,
  createApiCategory,
  createApiPromotion,
} from '@scayle/storefront/test'
import { createMockCategory } from '../../../test/mock-data/categories'
import {
  createMockCampaign,
  createMockPromotion,
  createMockTieredPromotion,
} from '../../../test/mock-data/promotions'
import { createMockStorefrontContext } from '../../../test/utils/context'
import { CampaignMapperService } from './campaign-mapper'
import { CategoryMapperService } from './category-mapper'
import { PromotionMapperService } from './promotion-mapper'

// Each `src/test/mock-data` factory promises the shape the application's
// mapper produces. Feeding the mapper a Storefront API response with the
// factory's values pins that promise, so a mapper change fails here instead of
// leaving the factory to drift. Lives next to the mappers because no vitest
// project collects tests under `src/test`.
const context = createMockStorefrontContext()

const runningSchedule = {
  from: '2026-01-01T00:00:00Z' as RFC3339Date,
  to: '2099-12-31T23:59:59Z' as RFC3339Date,
}

function relativeDiscount(value: number) {
  return {
    type: 'automatic_discount',
    additionalData: { type: 'relative', value },
  } as const
}

describe('createMockPromotion', () => {
  it('matches the promotion PromotionMapperService maps', () => {
    const mapper = new PromotionMapperService(context)

    expect(createMockPromotion()).toEqual(
      mapper.mapPromotion(
        createApiPromotion({
          displayName: undefined,
          schedule: runningSchedule,
          effect: relativeDiscount(10),
        }),
      ),
    )
  })
})

describe('createMockTieredPromotion', () => {
  it('matches the tiered promotion PromotionMapperService maps', () => {
    const mapper = new PromotionMapperService(context)

    expect(createMockTieredPromotion()).toEqual(
      mapper.mapPromotion(
        createApiPromotion({
          id: 'tiered-promo-1',
          name: 'Spend More',
          displayName: 'Spend more, save more',
          schedule: runningSchedule,
          effect: relativeDiscount(10),
          tiers: [
            {
              id: 1,
              name: 'Tier 1',
              mov: 5000 as CentAmount,
              effect: relativeDiscount(10),
            },
            {
              id: 2,
              name: 'Tier 2',
              mov: 10000 as CentAmount,
              effect: relativeDiscount(15),
            },
            {
              id: 3,
              name: 'Tier 3',
              mov: 15000 as CentAmount,
              effect: relativeDiscount(20),
            },
          ],
        }),
      ),
    )
  })
})

describe('createMockCampaign', () => {
  it('matches the campaign CampaignMapperService maps', () => {
    const mapper = new CampaignMapperService(context)

    expect(createMockCampaign()).toEqual(
      mapper.mapCampaign(
        createApiCampaign({
          id: 1,
          key: 'summer-campaign',
          name: 'Summer Campaign',
          headline: 'Summer Campaign',
          subline: '',
          link: '',
          condition: '',
          startsAt: runningSchedule.from,
          endsAt: runningSchedule.to,
          color: undefined,
          product: undefined,
        }),
      ),
    )
  })
})

describe('createMockCategory', () => {
  it('matches the root category CategoryMapperService maps', () => {
    const mapper = new CategoryMapperService(context)

    expect(createMockCategory()).toEqual(
      mapper.mapCategory(createApiCategory()),
    )
  })
})
