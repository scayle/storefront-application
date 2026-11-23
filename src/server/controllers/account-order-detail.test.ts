import { describe, expect, it, vi } from 'vitest'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'
import { createMockOrder } from '../../test/mock-data/orders'
import {
  createMockMapperRegistry,
  createMockServiceRegistry,
  createMockSSRRenderContext,
  createMockStorefrontContext,
} from '../../test/utils/context'
import { AccountOrderDetailController } from './account-order-detail'

describe('accountOrderDetailController', () => {
  it('renders AccountOrderDetail with the order and noindex meta named after the order id', async () => {
    const order = createMockOrder({ id: 123 })
    const storefront = createMockStorefrontContext()
    const mappers = createMockMapperRegistry(storefront)
    const { i18n } = mappers
    const ctx = createMockSSRRenderContext({
      url: 'https://example.com/de/account/orders/123',
      params: { id: '123' },
      variables: {
        storefront,
        mappers,
        services: createMockServiceRegistry({
          order: { getOrder: vi.fn().mockResolvedValue(order) },
          shopConfig: { getShopName: vi.fn().mockResolvedValue('Test Shop') },
        }),
      },
    })

    await new AccountOrderDetailController(ctx).view()

    expect(ctx.render).toHaveBeenCalledWith('AccountOrderDetail', {
      order,
      meta: expect.any(Function),
    })
    const { meta } = vi.mocked(ctx.render).mock.calls[0]![1] as {
      meta: () => Promise<SEOMeta>
    }
    await expect(meta()).resolves.toEqual({
      title: withShopName(
        i18n,
        i18n.t('account.order_detail.meta.title', { id: 123 }),
        'Test Shop',
      ),
      description: i18n.t('account.order_detail.meta.description', {
        id: 123,
      }),
      robots: 'noindex, nofollow',
    })
  })
})
