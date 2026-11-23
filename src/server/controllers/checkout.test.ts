import { describe, expect, it, vi } from 'vitest'
import type { SSRRenderContext } from '@scayle/storefront'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'
import { createMockBasket } from '../../test/mock-data/basket'
import {
  createMockMapperRegistry,
  createMockServiceRegistry,
  createMockSSRRenderContext,
  createMockStorefrontContext,
} from '../../test/utils/context'
import { CheckoutController } from './checkout'

interface RenderedProps {
  checkoutJwt: () => Promise<string>
  accessToken: () => Promise<string | undefined>
  meta: () => Promise<SEOMeta>
  shopName: () => Promise<string | undefined>
  checkoutHeader: () => Promise<unknown>
}

function createContext(
  fetchCheckoutHeaderNavigation = vi.fn().mockResolvedValue([]),
): SSRRenderContext {
  const storefront = createMockStorefrontContext()
  return createMockSSRRenderContext({
    url: 'https://example.com/de/checkout?utm_source=newsletter',
    variables: {
      storefront,
      mappers: createMockMapperRegistry(storefront),
      services: createMockServiceRegistry({
        basket: {
          getBasketKey: vi.fn(() => 'basket-key'),
          fetchBasket: vi.fn().mockResolvedValue(createMockBasket()),
        },
        checkout: {
          generateCheckoutJwt: vi.fn().mockResolvedValue('checkoutJWT'),
        },
        auth: { getAccessToken: vi.fn().mockResolvedValue('access-token') },
        navigation: { fetchCheckoutHeaderNavigation },
        shopConfig: { getShopName: vi.fn().mockResolvedValue('Test Shop') },
      }),
    },
  })
}

async function renderProps(ctx: SSRRenderContext): Promise<RenderedProps> {
  await new CheckoutController(ctx).view()
  return vi.mocked(ctx.render).mock.calls[0]![1] as RenderedProps
}

describe('checkout controller', () => {
  it('renders the Checkout page with noindex meta, the shop name and a canonical link', async () => {
    const ctx = createContext()
    const { i18n } = ctx.get('mappers')!

    const props = await renderProps(ctx)

    expect(ctx.render).toHaveBeenCalledWith('Checkout', expect.anything())
    await expect(props.meta()).resolves.toEqual({
      title: withShopName(
        i18n,
        i18n.t('checkout_page.meta.title'),
        'Test Shop',
      ),
      description: i18n.t('checkout_page.meta.description'),
      robots: 'noindex, nofollow',
      canonicalLink: {
        rel: 'canonical',
        key: 'canonical',
        href: 'https://example.com/de/checkout',
      },
    })
  })

  it('resolves the shop name for the simple layout header', async () => {
    const props = await renderProps(createContext())

    await expect(props.shopName()).resolves.toBe('Test Shop')
  })

  it('degrades a failed checkout header navigation fetch to an empty array', async () => {
    const props = await renderProps(
      createContext(vi.fn().mockResolvedValue(undefined)),
    )

    await expect(props.checkoutHeader()).resolves.toEqual([])
  })

  it('resolves the access token of the auth service', async () => {
    const props = await renderProps(createContext())

    await expect(props.accessToken()).resolves.toBe('access-token')
  })

  it('resolves the checkout JWT signed by the checkout service', async () => {
    const props = await renderProps(createContext())

    await expect(props.checkoutJwt()).resolves.toBe('checkoutJWT')
  })
})
