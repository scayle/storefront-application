import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { getSubscriptionOrigin } from '@scayle/storefront/shared'
import type { SSRRenderContext } from '@scayle/storefront'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'
import {
  createMockMapperRegistry,
  createMockServiceRegistry,
  createMockSession,
  createMockSSRRenderContext,
  createMockStorefrontContext,
} from '../../test/utils/context'
import { AccountSubscriptionsController } from './account-subscriptions'

// `jose.decodeJwt` only base64url-decodes the payload (no signature check), so a
// hand-built token with a far-future `exp` passes `getValidAccessToken`.
const ACCESS_TOKEN = `header.${Buffer.from(
  JSON.stringify({ exp: 9999999999 }),
).toString('base64url')}.signature`

function createContext({
  subscriptionEnabled = true,
  accessToken,
}: {
  subscriptionEnabled?: boolean
  accessToken?: string
} = {}): SSRRenderContext {
  const storefront = createMockStorefrontContext({
    config: { tenantSpace: 'acme' },
    country: {
      publicFields: { subscriptionEnabled, consentManagementRequired: false },
    },
  })
  return createMockSSRRenderContext({
    url: 'https://shop.example.com/de/account/subscriptions',
    variables: {
      storefront,
      mappers: createMockMapperRegistry(storefront),
      services: createMockServiceRegistry({
        shopConfig: { getShopName: vi.fn().mockResolvedValue('Test Shop') },
      }),
      session: createMockSession({ accessToken }),
    },
  })
}

describe('accountSubscriptionsController', () => {
  it('renders AccountSubscriptions with the session access token and the subscription API of the tenant space', async () => {
    const ctx = createContext({ accessToken: ACCESS_TOKEN })

    await new AccountSubscriptionsController(ctx).view()

    expect(ctx.render).toHaveBeenCalledWith(
      'AccountSubscriptions',
      expect.objectContaining({
        apiBaseUrl: `${getSubscriptionOrigin('acme')}/storefront-api`,
        accessToken: ACCESS_TOKEN,
      }),
    )
  })

  it('responds with 404 without rendering the page when subscriptions are disabled for the shop', async () => {
    const ctx = createContext({ subscriptionEnabled: false })

    const response = await new AccountSubscriptionsController(ctx).view()

    expect(response.status).toBe(404)
    expect(ctx.render).not.toHaveBeenCalled()
  })

  it('leaves the access token undefined for a session without one', async () => {
    const ctx = createContext()

    await new AccountSubscriptionsController(ctx).view()

    expect(ctx.render).toHaveBeenCalledWith(
      'AccountSubscriptions',
      expect.objectContaining({ accessToken: undefined }),
    )
  })

  it('builds noindex meta with the shop name suffixed onto the title', async () => {
    const ctx = createContext()
    const { i18n } = ctx.get('mappers')!

    await new AccountSubscriptionsController(ctx).view()

    const { meta } = vi.mocked(ctx.render).mock.calls[0]![1] as {
      meta: () => Promise<SEOMeta>
    }
    await expect(meta()).resolves.toEqual({
      title: withShopName(
        i18n,
        i18n.t('subscription.page.meta.title'),
        'Test Shop',
      ),
      description: i18n.t('subscription.page.meta.description'),
      robots: 'noindex, nofollow',
    })
  })
})
