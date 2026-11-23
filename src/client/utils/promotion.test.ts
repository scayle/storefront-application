import { describe, expect, it } from 'vitest'
import type { Promotion } from '@scayle/storefront/types'
import {
  createMockCampaign,
  createMockPromotion,
  createMockTieredPromotion,
} from '@test/mock-data/promotions'
import { getDealPlacement, isTieredPromotion } from './promotion'

const promotion = (id: string, name = `Promotion ${id}`) =>
  ({ id, name }) as Promotion
const promotions = [promotion('a'), promotion('b'), promotion('c')]

describe('getDealPlacement', () => {
  it('counts a shown campaign banner as the first deal of the set', () => {
    expect(
      getDealPlacement('pdp_banner', promotions, true, 'campaign'),
    ).toEqual({ component_type: 'pdp_banner', position: 1, total: 4 })

    expect(getDealPlacement('pdp_banner', promotions, true, 0)).toEqual({
      component_type: 'pdp_banner',
      position: 2,
      total: 4,
    })
    expect(getDealPlacement('pdp_banner', promotions, true, 2)).toEqual({
      component_type: 'pdp_banner',
      position: 4,
      total: 4,
    })
  })

  it('leaves the promotion positions unchanged without a campaign banner', () => {
    expect(getDealPlacement('basket_banner', promotions, false, 0)).toEqual({
      component_type: 'basket_banner',
      position: 1,
      total: 3,
    })
    expect(getDealPlacement('basket_banner', promotions, false, 2)).toEqual({
      component_type: 'basket_banner',
      position: 3,
      total: 3,
    })
  })

  it('places a lone campaign banner as 1 of 1', () => {
    expect(
      getDealPlacement('deals_overview_banner', [], true, 'campaign'),
    ).toEqual({
      component_type: 'deals_overview_banner',
      position: 1,
      total: 1,
    })
  })

  it('reports no placement while the promotions are unresolved', () => {
    expect(
      getDealPlacement('pdp_banner', undefined, true, 'campaign'),
    ).toBeUndefined()
    expect(getDealPlacement('pdp_banner', undefined, false, 0)).toBeUndefined()
  })
})

describe('isTieredPromotion', () => {
  it.for([
    {
      name: 'a promotion with tiers',
      deal: createMockTieredPromotion(),
      expected: true,
    },
    {
      name: 'a promotion with an empty tiers list',
      deal: createMockPromotion({ tiers: [] }),
      expected: false,
    },
    {
      name: 'a promotion without tiers',
      deal: createMockPromotion(),
      expected: false,
    },
    { name: 'a campaign', deal: createMockCampaign(), expected: false },
  ])('returns $expected for $name', ({ deal, expected }) => {
    expect(isTieredPromotion(deal)).toBe(expected)
  })
})
