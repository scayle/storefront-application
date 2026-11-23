import { describe, expect, it, vi } from 'vitest'
import { ContentfulCMSService } from '@scayle/storefront-cms-contentful'
import type { CMSPageData } from '@shared/types/cms/contentful'
import { createMockStorefrontContext } from '@test/utils/context'
import { createCMSService, getPageMeta } from './service'

vi.mock(import('@scayle/storefront-cms-contentful'), { spy: true })

describe('contentful getPageMeta', () => {
  it('extracts meta fields from a page entry via the generated type guard', () => {
    const data = {
      entry: {
        sys: { contentType: { sys: { id: 'PageComponent' } } },
        fields: {
          metaTitle: 'About us',
          metaDescription: 'Our story',
          robots: 'index, follow',
          socialShareImage: { fields: { file: { url: '//img.jpg' } } },
        },
      },
    }

    expect(getPageMeta(data as unknown as CMSPageData)).toEqual({
      title: 'About us',
      description: 'Our story',
      robots: 'index, follow',
      image: '//img.jpg',
    })
  })

  it('returns undefined for a product listing page entry, which carries no meta fields', () => {
    const listingPage = {
      entry: {
        sys: { contentType: { sys: { id: 'productListingPageComponent' } } },
        fields: { metaTitle: 'Ignored' },
      },
    }

    expect(getPageMeta(listingPage as unknown as CMSPageData)).toBeUndefined()
  })

  it('returns undefined when neither guard matches', () => {
    expect(getPageMeta({ entry: {} } as unknown as CMSPageData)).toBeUndefined()
  })
})

describe('createCMSService', () => {
  it('names every missing Contentful variable in one error', () => {
    vi.stubEnv('CONTENTFUL_CMS_ACCESS_TOKEN', undefined)
    vi.stubEnv('CONTENTFUL_CMS_SPACE', undefined)
    vi.stubEnv('CONTENTFUL_CMS_PREVIEW_ACCESS_TOKEN', undefined)

    const create = () => createCMSService(createMockStorefrontContext())

    expect(create).toThrow(/CONTENTFUL_CMS_ACCESS_TOKEN/)
    expect(create).toThrow(/CONTENTFUL_CMS_SPACE/)
    expect(create).toThrow(/CONTENTFUL_CMS_PREVIEW_ACCESS_TOKEN/)
  })

  // The provider reads the flag only when it fetches, so the parsed value is
  // checked where it leaves the application: the provider config.
  it.for([
    { value: 'True', expected: true },
    { value: 'false', expected: false },
  ])(
    'sets draftContentEnabled to $expected when STOREFRONT_CMS_ALLOW_DRAFTS is $value',
    ({ value, expected }) => {
      vi.stubEnv('CONTENTFUL_CMS_ACCESS_TOKEN', 'token')
      vi.stubEnv('CONTENTFUL_CMS_SPACE', 'space')
      vi.stubEnv('CONTENTFUL_CMS_PREVIEW_ACCESS_TOKEN', 'preview-token')
      vi.stubEnv('STOREFRONT_CMS_ALLOW_DRAFTS', value)

      createCMSService(createMockStorefrontContext())

      expect(ContentfulCMSService).toHaveBeenCalledWith(
        expect.objectContaining({ draftContentEnabled: expected }),
        expect.anything(),
      )
    },
  )
})
