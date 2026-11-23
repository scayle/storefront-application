import { describe, expect, it, vi } from 'vitest'
import type { SSRRenderContext } from '@scayle/storefront'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'
import { createMockWishlist } from '../../test/mock-data/wishlist'
import {
  createMockMapperRegistry,
  createMockServiceRegistry,
  createMockSSRRenderContext,
  createMockStorefrontContext,
} from '../../test/utils/context'
import { WishlistController } from './wishlist'

const WISHLIST = createMockWishlist()

function createContext(
  url = 'https://shop.example.com/de/wishlist',
): SSRRenderContext {
  const storefront = createMockStorefrontContext()
  return createMockSSRRenderContext({
    url,
    variables: {
      storefront,
      mappers: createMockMapperRegistry(storefront),
      services: createMockServiceRegistry({
        shopConfig: { getShopName: vi.fn().mockResolvedValue('Test Shop') },
        wishlist: { fetchWishlist: vi.fn().mockResolvedValue(WISHLIST) },
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

describe('WishlistController', () => {
  it('renders Wishlist with the fetched wishlist', async () => {
    const ctx = createContext()

    await new WishlistController(ctx).view()

    expect(ctx.render).toHaveBeenCalledWith('Wishlist', {
      wishlist: WISHLIST,
      meta: expect.any(Function),
    })
  })

  it('builds noindex meta with the shop name suffixed onto the title', async () => {
    const ctx = createContext()
    const { i18n } = ctx.get('mappers')!

    await new WishlistController(ctx).view()

    await expect(renderedMeta(ctx)).resolves.toEqual({
      title: withShopName(
        i18n,
        i18n.t('wishlist_page.meta.title'),
        'Test Shop',
      ),
      description: i18n.t('wishlist_page.meta.description'),
      robots: 'noindex, nofollow',
      canonicalLink: {
        rel: 'canonical',
        key: 'canonical',
        href: 'https://shop.example.com/de/wishlist',
      },
    })
  })

  it('strips non-canonical query parameters from the canonical link', async () => {
    const ctx = createContext(
      'https://shop.example.com/de/wishlist?utm_source=newsletter&page=2',
    )

    await new WishlistController(ctx).view()

    await expect(renderedMeta(ctx)).resolves.toMatchObject({
      canonicalLink: {
        rel: 'canonical',
        key: 'canonical',
        href: 'https://shop.example.com/de/wishlist?page=2',
      },
    })
  })
})
