import { describe, expect, it, vi } from 'vitest'
import { StoryblokCMSService } from '@scayle/storefront-cms-storyblok'
import type { CMSPageData } from '@shared/types/cms/storyblok'
import { createMockStorefrontContext } from '@test/utils/context'
import { createCMSService, getPageMeta } from './service'

vi.mock(import('@scayle/storefront-cms-storyblok'), { spy: true })

describe('storyblok getPageMeta', () => {
  it('extracts meta fields from a PageComponent story', () => {
    const data = {
      story: {
        content: {
          component: 'PageComponent',
          metaTitle: 'About us',
          metaDescription: 'Our story',
          robots: 'index, follow',
          socialShareImage: { filename: 'https://a.storyblok.com/image.jpg' },
        },
      },
    }

    expect(getPageMeta(data as unknown as CMSPageData)).toEqual({
      title: 'About us',
      description: 'Our story',
      robots: 'index, follow',
      image: 'https://a.storyblok.com/image.jpg',
    })
  })

  it('returns undefined for a non-page component', () => {
    const data = { story: { content: { component: 'OtherComponent' } } }

    expect(getPageMeta(data as unknown as CMSPageData)).toBeUndefined()
  })
})

describe('createCMSService', () => {
  it('names the access token when it is not configured', () => {
    vi.stubEnv('STORYBLOK_CMS_ACCESS_TOKEN', undefined)

    expect(() => createCMSService(createMockStorefrontContext())).toThrow(
      /STORYBLOK_CMS_ACCESS_TOKEN/,
    )
  })

  // The provider reads the flag only when it fetches, so the parsed value is
  // checked where it leaves the application: the provider config.
  it.for([
    { value: 'True', expected: true },
    { value: 'false', expected: false },
  ])(
    'sets draftContentEnabled to $expected when STOREFRONT_CMS_ALLOW_DRAFTS is $value',
    ({ value, expected }) => {
      vi.stubEnv('STORYBLOK_CMS_ACCESS_TOKEN', 'token')
      vi.stubEnv('STOREFRONT_CMS_ALLOW_DRAFTS', value)

      createCMSService(createMockStorefrontContext())

      expect(StoryblokCMSService).toHaveBeenCalledWith(
        expect.objectContaining({ draftContentEnabled: expected }),
        expect.anything(),
      )
    },
  )
})
