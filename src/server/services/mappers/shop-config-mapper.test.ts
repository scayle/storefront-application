import { describe, expect, it } from 'vitest'
import type { ShopConfiguration } from '@scayle/storefront-api'
import { ShopConfigMapper } from '@scayle/storefront/mappers'
import { formatCurrency } from '@shared/utils/formatter'
import { ServerI18nService } from '@server/services/i18n'
import {
  createMockMapperRegistry,
  createMockStorefrontContext,
} from '../../../test/utils/context'
import { ShopConfigMapperService } from './shop-config-mapper'

function createShopConfiguration(
  overrides: Partial<ShopConfiguration> = {},
): ShopConfiguration {
  return {
    shopId: 1001,
    name: 'Test Shop',
    country: 'DE',
    customData: {},
    shopCustomData: {},
    properties: [],
    ...overrides,
  }
}

describe('ShopConfigMapperService', () => {
  const context = createMockStorefrontContext()
  const mapper = new ShopConfigMapperService(
    context,
    createMockMapperRegistry(context),
  )

  it('keeps the base mapping of everything but the delivery cost', () => {
    const shopConfig = createShopConfiguration()

    expect(mapper.mapShopConfig(shopConfig)).toMatchObject({
      ...new ShopConfigMapper(context).mapShopConfig(shopConfig),
      deliveryCost: expect.any(Object),
    })
  })

  it('takes deliveryCosts from Panel custom data when value and disclaimer are set', () => {
    const deliveryCosts = {
      value: 'from EUR 4.99',
      disclaimer: '* Fees at checkout',
    }

    const result = mapper.mapShopConfig(
      createShopConfiguration({ customData: { deliveryCosts } }),
    )

    expect(result.deliveryCost).toEqual(deliveryCosts)
  })

  it.for<{ case: string; customData?: ShopConfiguration['customData'] }>([
    {
      case: 'value and disclaimer are empty',
      customData: { deliveryCosts: { value: '', disclaimer: '' } },
    },
    {
      case: 'only the value is set',
      customData: { deliveryCosts: { value: 'from EUR 4.99', disclaimer: '' } },
    },
    {
      case: 'only the disclaimer is set',
      customData: {
        deliveryCosts: { value: '', disclaimer: '* Fees at checkout' },
      },
    },
    { case: 'deliveryCosts is absent', customData: {} },
    { case: 'customData is absent' },
  ])('falls back to localized deliveryCosts when $case', ({ customData }) => {
    const i18n = new ServerI18nService(context)

    const result = mapper.mapShopConfig(createShopConfiguration({ customData }))

    expect(result.deliveryCost).toEqual({
      value: i18n.t('price.starting_from_with_amount', {
        amount: formatCurrency(0, context.country),
      }),
      disclaimer: i18n.t('basket_summary.delivery_fees'),
    })
  })
})
