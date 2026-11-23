import { describe, expect, it, vi } from 'vitest'
import { getSubscriptionOrigin } from '@scayle/storefront/shared'
import type { SSRRenderContext } from '@scayle/storefront'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'
import {
  createMockMapperRegistry,
  createMockServiceRegistry,
  createMockSSRRenderContext,
  createMockStorefrontContext,
} from '../../test/utils/context'
import { SubscriptionCancellationController } from './subscription-cancellation'

function createContext({
  subscriptionEnabled = true,
}: { subscriptionEnabled?: boolean } = {}): SSRRenderContext {
  const storefront = createMockStorefrontContext({
    config: { tenantSpace: 'acme' },
    country: {
      publicFields: { subscriptionEnabled, consentManagementRequired: false },
    },
  })
  return createMockSSRRenderContext({
    url: 'https://shop.example.com/de/subscription-cancellation',
    variables: {
      storefront,
      mappers: createMockMapperRegistry(storefront),
      services: createMockServiceRegistry({
        shopConfig: { getShopName: vi.fn().mockResolvedValue('Test Shop') },
      }),
    },
  })
}

describe('subscriptionCancellationController', () => {
  it('renders SubscriptionCancellation with the subscription API of the tenant space', async () => {
    const ctx = createContext()

    await new SubscriptionCancellationController(ctx).view()

    expect(ctx.render).toHaveBeenCalledWith(
      'SubscriptionCancellation',
      expect.objectContaining({
        apiBaseUrl: `${getSubscriptionOrigin('acme')}/storefront-api`,
      }),
    )
  })

  it('responds with 404 without rendering the page when subscriptions are disabled for the shop', async () => {
    const ctx = createContext({ subscriptionEnabled: false })

    const response = await new SubscriptionCancellationController(ctx).view()

    expect(response.status).toBe(404)
    expect(ctx.render).not.toHaveBeenCalled()
  })

  it('sends no access token, since the page is public', async () => {
    const ctx = createContext()

    await new SubscriptionCancellationController(ctx).view()

    const props = vi.mocked(ctx.render).mock.calls[0]![1]
    expect(props).not.toHaveProperty('accessToken')
  })

  it('builds noindex meta with the shop name suffixed onto the title', async () => {
    const ctx = createContext()
    const { i18n } = ctx.get('mappers')!

    await new SubscriptionCancellationController(ctx).view()

    const { meta } = vi.mocked(ctx.render).mock.calls[0]![1] as {
      meta: () => Promise<SEOMeta>
    }
    await expect(meta()).resolves.toEqual({
      title: withShopName(
        i18n,
        i18n.t('subscription.cancellation.meta.title'),
        'Test Shop',
      ),
      description: i18n.t('subscription.cancellation.meta.description'),
      robots: 'noindex, nofollow',
    })
  })
})
