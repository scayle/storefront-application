import { describe, expect, it } from 'vitest'
import type { ContentstackPageContent } from '@shared/types/cms/contentstack'
import { getCmsListingContent } from './listing'

describe('getCmsListingContent', () => {
  it('extracts teaser_content and seo_content from valid data', () => {
    const teaser = [
      {
        _content_type_uid: 'text-component',
        uid: 'teaser-1',
        title: 'Teaser',
        content: 'Sale',
        text_type: 'p',
      },
    ]
    const seo = [
      {
        _content_type_uid: 'text-component',
        uid: 'seo-1',
        title: 'SEO',
        content: 'SEO text',
        text_type: 'p',
      },
    ]
    const data = {
      teaser_content: teaser,
      seo_content: seo,
      title: 'PLP',
      url: '/category',
    } as unknown as ContentstackPageContent

    const result = getCmsListingContent(data)

    expect(result.teaserContent).toEqual(teaser)
    expect(result.seoContent).toEqual(seo)
  })

  it.for([
    { case: 'undefined', data: undefined },
    { case: 'null', data: null },
    {
      case: 'content without teaser_content or seo_content',
      data: {
        title: 'PLP',
        url: '/category',
      } as unknown as ContentstackPageContent,
    },
  ])('returns empty arrays for $case', ({ data }) => {
    expect(getCmsListingContent(data)).toEqual({
      teaserContent: [],
      seoContent: [],
    })
  })
})
