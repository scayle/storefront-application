import { describe, it, expect } from 'vitest'
import type { Campaign as StorefrontAPICampaign } from '@scayle/storefront-api'
import { CampaignMapper } from '@scayle/storefront/mappers'
import { createApiCampaign } from '@scayle/storefront/test'
import { createMockStorefrontContext } from '../../../test/utils/context'
import { CampaignMapperService } from './campaign-mapper'

describe('CampaignMapperService', () => {
  const context = createMockStorefrontContext()
  const mapper = new CampaignMapperService(context)

  it('keeps the base mapping of everything but the color', () => {
    const campaign = createApiCampaign()

    expect(mapper.mapCampaign(campaign)).toMatchObject({
      ...new CampaignMapper(context).mapCampaign(campaign),
      color: expect.any(Object),
    })
  })

  it.for<{
    case: string
    color: StorefrontAPICampaign['color']
    expected: { backgroundColor: string; color: string }
  }>([
    {
      case: 'the raw colors',
      color: { background: '#aabbcc', text: '#112233' },
      expected: { backgroundColor: '#aabbcc', color: '#112233' },
    },
    {
      case: 'theme variables for empty colors',
      color: { background: '', text: '' },
      expected: {
        backgroundColor: 'var(--color-campaign)',
        color: 'var(--color-primary)',
      },
    },
    {
      case: 'theme variables when color is missing',
      color: undefined,
      expected: {
        backgroundColor: 'var(--color-campaign)',
        color: 'var(--color-primary)',
      },
    },
  ])(
    'maps the color to Vue inline styles with $case',
    ({ color, expected }) => {
      expect(mapper.mapCampaign(createApiCampaign({ color })).color).toEqual(
        expected,
      )
    },
  )
})
