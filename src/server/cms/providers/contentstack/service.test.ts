import { describe, expect, it, vi } from 'vitest'
import { ContentstackCMSService } from '@scayle/storefront-cms-contentstack'
import type { CMSPageData } from '@shared/types/cms/contentstack'
import { createMockStorefrontContext } from '@test/utils/context'
import { createCMSService, getPageMeta } from './service'

vi.mock(import('@scayle/storefront-cms-contentstack'), { spy: true })

describe('contentstack getPageMeta', () => {
  it('extracts meta fields from a page entry', () => {
    const data = {
      entry: {
        seo: {
          meta_title: 'About us',
          meta_description: 'Our story',
          robots: 'index, follow',
          social_share_image: { url: 'https://img.jpg' },
        },
      },
    }

    expect(getPageMeta(data as unknown as CMSPageData)).toEqual({
      title: 'About us',
      description: 'Our story',
      robots: 'index, follow',
      image: 'https://img.jpg',
    })
  })

  it('extracts only the image for a listing entry without seo', () => {
    const data = {
      entry: {
        seo: { meta_title: undefined },
        social_share_image: { url: 'https://plp-img.jpg' },
      },
    }

    // First branch matches (isPageComponent checks only for a `seo` object),
    // so this exercises the PageComponent path with sparse seo fields.
    expect(getPageMeta(data as unknown as CMSPageData)?.image).toBeUndefined()
  })

  it('returns undefined when the entry has no seo field', () => {
    expect(getPageMeta({ entry: {} } as unknown as CMSPageData)).toBeUndefined()
  })
})

describe('createCMSService', () => {
  it('names every missing required Contentstack variable in one error', () => {
    vi.stubEnv('CONTENTSTACK_CMS_STACK_API_KEY', undefined)
    vi.stubEnv('CONTENTSTACK_CMS_DELIVERY_TOKEN', undefined)
    vi.stubEnv('CONTENTSTACK_CMS_ENVIRONMENT', undefined)

    const create = () => createCMSService(createMockStorefrontContext())

    expect(create).toThrow(/CONTENTSTACK_CMS_STACK_API_KEY/)
    expect(create).toThrow(/CONTENTSTACK_CMS_DELIVERY_TOKEN/)
    expect(create).toThrow(/CONTENTSTACK_CMS_ENVIRONMENT/)
  })

  it('does not require the region, branch, or preview token', () => {
    vi.stubEnv('CONTENTSTACK_CMS_STACK_API_KEY', 'key')
    vi.stubEnv('CONTENTSTACK_CMS_DELIVERY_TOKEN', 'delivery')
    vi.stubEnv('CONTENTSTACK_CMS_ENVIRONMENT', 'production')
    vi.stubEnv('CONTENTSTACK_CMS_REGION', undefined)
    vi.stubEnv('CONTENTSTACK_CMS_BRANCH', undefined)
    vi.stubEnv('CONTENTSTACK_CMS_PREVIEW_ACCESS_TOKEN', undefined)

    expect(() => createCMSService(createMockStorefrontContext())).not.toThrow()
  })

  // The provider reads the flag only when it fetches, so the parsed value is
  // checked where it leaves the application: the provider config.
  it.for([
    { value: 'True', expected: true },
    { value: 'false', expected: false },
  ])(
    'sets draftContentEnabled to $expected when STOREFRONT_CMS_ALLOW_DRAFTS is $value',
    ({ value, expected }) => {
      vi.stubEnv('CONTENTSTACK_CMS_STACK_API_KEY', 'key')
      vi.stubEnv('CONTENTSTACK_CMS_DELIVERY_TOKEN', 'delivery')
      vi.stubEnv('CONTENTSTACK_CMS_ENVIRONMENT', 'production')
      vi.stubEnv('STOREFRONT_CMS_ALLOW_DRAFTS', value)

      createCMSService(createMockStorefrontContext())

      expect(ContentstackCMSService).toHaveBeenCalledWith(
        expect.objectContaining({ draftContentEnabled: expected }),
        expect.anything(),
      )
    },
  )
})
