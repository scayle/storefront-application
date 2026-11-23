import { describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import type { SSRRenderContext } from '@scayle/storefront'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'
import { createMockOrder } from '../../test/mock-data/orders'
import {
  createMockMapperRegistry,
  createMockServiceRegistry,
  createMockSSRRenderContext,
  createMockStorefrontContext,
} from '../../test/utils/context'
import { OrderSuccessController } from './orderSuccess'

function createContext(getOrderFromCBD: Mock) {
  const storefront = createMockStorefrontContext()
  return createMockSSRRenderContext({
    url: 'https://example.com/de/success?cbd=valid-token',
    variables: {
      storefront,
      mappers: createMockMapperRegistry(storefront),
      services: createMockServiceRegistry({
        order: { getOrderFromCBD },
        shopConfig: { getShopName: vi.fn().mockResolvedValue('Test Shop') },
      }),
    },
  })
}

/** Reads the meta factory of the single `ctx.render` call. */
function renderedMeta(ctx: SSRRenderContext) {
  const { meta } = vi.mocked(ctx.render).mock.calls[0]![1] as {
    meta: () => Promise<SEOMeta>
  }
  return meta()
}

describe('OrderSuccessController', () => {
  it('renders the order success page with the order meta when the order resolves', async () => {
    const order = createMockOrder()
    const ctx = createContext(vi.fn().mockResolvedValue(order))
    const { i18n } = ctx.get('mappers')!

    await new OrderSuccessController(ctx).view()

    expect(ctx.render).toHaveBeenCalledWith('OrderSuccess', {
      order,
      meta: expect.any(Function),
    })
    await expect(renderedMeta(ctx)).resolves.toEqual({
      title: withShopName(
        i18n,
        i18n.t('order_success_page.meta.title'),
        'Test Shop',
      ),
      description: i18n.t('order_success_page.meta.description'),
      robots: 'noindex, nofollow',
    })
  })

  it('renders the empty state with the no-order meta when the order fetch fails', async () => {
    const ctx = createContext(vi.fn().mockRejectedValue(new Error('SAPI down')))
    const { i18n } = ctx.get('mappers')!

    await new OrderSuccessController(ctx).view()

    expect(ctx.render).toHaveBeenCalledExactlyOnceWith('OrderSuccess', {
      order: undefined,
      meta: expect.any(Function),
    })
    await expect(renderedMeta(ctx)).resolves.toEqual({
      title: withShopName(
        i18n,
        i18n.t('order_success_page.no_order_found.meta.title'),
        'Test Shop',
      ),
      description: i18n.t('order_success_page.no_order_found.description'),
      robots: 'noindex, nofollow',
    })
  })
})
