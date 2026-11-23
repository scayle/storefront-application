import { describe, expect, it, vi } from 'vitest'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'
import {
  createMockMapperRegistry,
  createMockServiceRegistry,
  createMockSSRRenderContext,
  createMockStorefrontContext,
} from '../../test/utils/context'
import { AccountProfileController } from './account-profile'

describe('accountProfileController', () => {
  it('renders AccountProfile with noindex meta titled with the shop name', async () => {
    const storefront = createMockStorefrontContext()
    const mappers = createMockMapperRegistry(storefront)
    const { i18n } = mappers
    const ctx = createMockSSRRenderContext({
      url: 'https://example.com/de/account/profile',
      variables: {
        storefront,
        mappers,
        services: createMockServiceRegistry({
          shopConfig: { getShopName: vi.fn().mockResolvedValue('Test Shop') },
        }),
      },
    })

    await new AccountProfileController(ctx).view()

    expect(ctx.render).toHaveBeenCalledWith('AccountProfile', expect.anything())
    const { meta } = vi.mocked(ctx.render).mock.calls[0]![1] as {
      meta: () => Promise<SEOMeta>
    }
    await expect(meta()).resolves.toEqual({
      title: withShopName(
        i18n,
        i18n.t('account.profile.meta.title'),
        'Test Shop',
      ),
      robots: 'noindex, nofollow',
    })
  })
})
