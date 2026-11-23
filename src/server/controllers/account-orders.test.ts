import { describe, expect, it, vi } from 'vitest'
import type { OrderSummary } from '@scayle/storefront/types'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'
import {
  createMockMapperRegistry,
  createMockServiceRegistry,
  createMockSSRRenderContext,
  createMockStorefrontContext,
} from '../../test/utils/context'
import { AccountOrdersController } from './account-orders'

describe('accountOrdersController', () => {
  it('renders AccountOrders with the eager order summaries and noindex meta', async () => {
    const orderSummaries: OrderSummary[] = [
      { id: 1, confirmedAt: '1/1/2025', itemCount: 3, status: 'order_open' },
      { id: 2, confirmedAt: '1/2/2025', itemCount: 5, status: 'order_open' },
    ]
    const storefront = createMockStorefrontContext()
    const mappers = createMockMapperRegistry(storefront)
    const { i18n } = mappers
    const ctx = createMockSSRRenderContext({
      url: 'https://example.com/de/account/orders',
      variables: {
        storefront,
        mappers,
        services: createMockServiceRegistry({
          order: {
            getOrderSummaries: vi.fn().mockResolvedValue(orderSummaries),
          },
          shopConfig: { getShopName: vi.fn().mockResolvedValue('Test Shop') },
        }),
      },
    })

    await new AccountOrdersController(ctx).view()

    expect(ctx.render).toHaveBeenCalledWith('AccountOrders', {
      orderSummaries,
      meta: expect.any(Function),
    })
    const { meta } = vi.mocked(ctx.render).mock.calls[0]![1] as {
      meta: () => Promise<SEOMeta>
    }
    await expect(meta()).resolves.toEqual({
      title: withShopName(
        i18n,
        i18n.t('account.orders.meta.title'),
        'Test Shop',
      ),
      robots: 'noindex, nofollow',
    })
  })
})
