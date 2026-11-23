import { describe, expect, it } from 'vitest'
import type { ContentfulEntry } from '@shared/types/cms/contentful'
import { getCmsListingContent } from './listing'

const teaserBlock = {
  sys: { id: 'teaser-1', contentType: { sys: { id: 'TextComponent' } } },
  fields: { content: 'Teaser' },
}
const seoBlock = {
  sys: { id: 'seo-1', contentType: { sys: { id: 'TextComponent' } } },
  fields: { content: 'SEO' },
}

const entry = (contentTypeId: string, fields: Record<string, unknown>) =>
  ({
    sys: { id: 'entry-1', contentType: { sys: { id: contentTypeId } } },
    fields,
  }) as unknown as ContentfulEntry

const empty = { teaserContent: [], seoContent: [] }

describe('getCmsListingContent', () => {
  it.for([
    {
      case: 'splits teaser and SEO content',
      payload: entry('ProductListingPageComponent', {
        teaserContent: [teaserBlock],
        seoContent: [seoBlock],
      }),
      expected: { teaserContent: [teaserBlock], seoContent: [seoBlock] },
    },
    {
      case: 'returns empty collections for a content page rather than leaking its blocks',
      payload: entry('PageComponent', { content: [teaserBlock] }),
      expected: empty,
    },
    {
      case: 'returns empty collections when the entry carries no fields',
      payload: { sys: { id: 'entry-1' } } as ContentfulEntry,
      expected: empty,
    },
    {
      // Most listing pages have no CMS entry at all.
      case: 'returns empty collections for an undefined payload, which is the common case',
      payload: undefined,
      expected: empty,
    },
    {
      case: 'returns empty collections for a null payload',
      payload: null,
      expected: empty,
    },
    {
      case: 'defaults each collection independently when only one is authored',
      payload: entry('ProductListingPageComponent', {
        teaserContent: [teaserBlock],
      }),
      expected: { teaserContent: [teaserBlock], seoContent: [] },
    },
  ])('$case', ({ payload, expected }) => {
    expect(getCmsListingContent(payload)).toEqual(expected)
  })
})
