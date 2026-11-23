import { describe, expect, it } from 'vitest'
import type { CMSPageData } from '@shared/types/cms/storyblok'
import { getCmsListingContent } from './listing'

/** Creates minimal CMSPageData with optional content override. */
const createPageData = (content?: Record<string, unknown>): CMSPageData =>
  ({
    story: { content: content ?? {} },
  }) as CMSPageData

describe('getCmsListingContent', () => {
  it('extracts teaserContent and seoContent from valid data', () => {
    const teaser = [{ component: 'teaser', text: 'Sale' }]
    const seo = [{ component: 'seo-block', text: 'SEO text' }]
    const data = createPageData({
      component: 'ProductListingPageComponent',
      teaserContent: teaser,
      seoContent: seo,
    })

    const result = getCmsListingContent(data)

    expect(result.teaserContent).toEqual(teaser)
    expect(result.seoContent).toEqual(seo)
  })

  it.for([
    { case: 'story content is missing', data: { story: {} } as CMSPageData },
    { case: 'data is undefined', data: undefined },
    { case: 'data is null', data: null },
    {
      case: 'the story is not a product listing page',
      data: createPageData({ someOtherField: 'value' }),
    },
    {
      case: 'a product listing page has no teaserContent or seoContent',
      data: createPageData({ component: 'ProductListingPageComponent' }),
    },
  ])('returns empty arrays when $case', ({ data }) => {
    expect(getCmsListingContent(data)).toEqual({
      teaserContent: [],
      seoContent: [],
    })
  })
})
