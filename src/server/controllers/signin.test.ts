import { describe, expect, it, vi } from 'vitest'
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
import { SignInController } from './signin'

function createSignInContext({
  query = {},
  customer,
  isMainRequest = true,
}: {
  query?: Record<string, string>
  customer?: { id: number }
  isMainRequest?: boolean
} = {}): SSRRenderContext {
  const storefront = createMockStorefrontContext()
  const url = new URL('https://shop.example.com/de/signin')
  url.search = new URLSearchParams(query).toString()

  return createMockSSRRenderContext({
    url,
    variables: {
      storefront,
      mappers: createMockMapperRegistry(storefront),
      services: createMockServiceRegistry({
        shopConfig: { getShopName: vi.fn().mockResolvedValue('Test Shop') },
      }),
      session: createMockSession({ customer, accessToken: undefined }),
      inertia: {
        isMainRequest: () => isMainRequest,
        navigate: vi.fn(
          (location: string, status?: number) =>
            new Response(null, { status, headers: { location } }),
        ),
      },
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

describe('SignInController', () => {
  it('renders SignIn for a signed-out user without the registration form and without an access token', async () => {
    const ctx = createSignInContext()

    await new SignInController(ctx).view()

    expect(ctx.render).toHaveBeenCalledWith(
      'SignIn',
      expect.objectContaining({
        showRegistration: false,
        accessToken: undefined,
      }),
    )
  })

  it('sets showRegistration when the register query param is true', async () => {
    const ctx = createSignInContext({ query: { register: 'true' } })

    await new SignInController(ctx).view()

    expect(ctx.render).toHaveBeenCalledWith(
      'SignIn',
      expect.objectContaining({ showRegistration: true }),
    )
  })

  it('builds noindex,follow meta with the shop name and canonical link', async () => {
    const ctx = createSignInContext()
    const { i18n } = ctx.get('mappers')!

    await new SignInController(ctx).view()

    await expect(renderedMeta(ctx)).resolves.toEqual({
      title: withShopName(i18n, i18n.t('sign_in_page.meta.title'), 'Test Shop'),
      description: i18n.t('sign_in_page.meta.description', {
        shopName: 'Test Shop',
      }),
      robots: 'noindex,follow',
      canonicalLink: {
        rel: 'canonical',
        key: 'canonical',
        href: 'https://shop.example.com/de/signin',
      },
    })
  })

  it('leaves out the description, which names the shop, when the shop name cannot be read', async () => {
    const ctx = createSignInContext()
    vi.mocked(ctx.get('services')!.shopConfig.getShopName).mockResolvedValue(
      undefined,
    )

    await new SignInController(ctx).view()

    await expect(renderedMeta(ctx)).resolves.toHaveProperty(
      'description',
      undefined,
    )
  })

  describe('authenticated visitors', () => {
    it('redirects to the account orders page without rendering', async () => {
      const ctx = createSignInContext({ customer: { id: 1 } })

      const response = await new SignInController(ctx).view()

      expect(ctx.render).not.toHaveBeenCalled()
      expect(ctx.get('inertia').navigate).toHaveBeenCalledWith(
        '/account/orders',
        302,
      )
      expect(response.status).toBe(302)
    })

    it('redirects to the site-relative redirectUrl when the auth guard set one', async () => {
      const ctx = createSignInContext({
        customer: { id: 1 },
        query: { redirectUrl: '/account/orders?page=2' },
      })

      await new SignInController(ctx).view()

      expect(ctx.get('inertia').navigate).toHaveBeenCalledWith(
        '/account/orders?page=2',
        302,
      )
    })

    it.each([
      ['protocol-relative', '//evil.example.com'],
      ['backslash authority', '/\\evil.example.com'],
      ['absolute', 'https://evil.example.com/account'],
    ])(
      'ignores an off-site %s redirectUrl and falls back to the account orders page',
      async (_label, redirectUrl) => {
        const ctx = createSignInContext({
          customer: { id: 1 },
          query: { redirectUrl },
        })

        await new SignInController(ctx).view()

        expect(ctx.get('inertia').navigate).toHaveBeenCalledWith(
          '/account/orders',
          302,
        )
      },
    )

    it('renders instead of redirecting on an Inertia partial reload', async () => {
      const ctx = createSignInContext({
        customer: { id: 1 },
        isMainRequest: false,
      })

      await new SignInController(ctx).view()

      expect(ctx.get('inertia').navigate).not.toHaveBeenCalled()
      expect(ctx.render).toHaveBeenCalledOnce()
    })
  })
})
