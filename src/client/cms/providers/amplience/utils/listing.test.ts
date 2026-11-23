import { describe, expect, it } from 'vitest'
import type { CMSPageData } from '@shared/types/cms/amplience'
import { getCmsListingContent } from './listing'

const LISTING_SCHEMA =
  'https://scayle.com/schemas/product-listing-page-component.json'
const PAGE_SCHEMA = 'https://scayle.com/schemas/page-component.json'

const teaserBlock = { componentType: 'text', text: { content: 'Teaser' } }
const seoBlock = { componentType: 'text', text: { content: 'SEO' } }

const listingPayload = {
  _meta: { schema: LISTING_SCHEMA },
  teaser_content: [teaserBlock],
  seo_content: [seoBlock],
} as unknown as CMSPageData

const pagePayload = {
  _meta: { schema: PAGE_SCHEMA },
  components: [teaserBlock],
} as unknown as CMSPageData

const teaserOnlyPayload = {
  _meta: { schema: LISTING_SCHEMA },
  teaser_content: [teaserBlock],
} as unknown as CMSPageData

describe('getCmsListingContent', () => {
  it.for([
    {
      reason: 'splits teaser and SEO content',
      payload: listingPayload,
      expected: { teaserContent: [teaserBlock], seoContent: [seoBlock] },
    },
    {
      reason:
        'defaults each collection independently when only one is authored',
      payload: teaserOnlyPayload,
      expected: { teaserContent: [teaserBlock], seoContent: [] },
    },
    {
      reason:
        'returns empty collections for a content page rather than leaking its blocks',
      payload: pagePayload,
      expected: { teaserContent: [], seoContent: [] },
    },
    {
      reason: 'returns empty collections when the payload carries no schema',
      payload: {} as CMSPageData,
      expected: { teaserContent: [], seoContent: [] },
    },
    // A category with no CMS content, which is the common case, arrives as
    // either of these.
    {
      reason: 'returns empty collections for an undefined payload',
      payload: undefined,
      expected: { teaserContent: [], seoContent: [] },
    },
    {
      reason: 'returns empty collections for a null payload',
      payload: null,
      expected: { teaserContent: [], seoContent: [] },
    },
  ])('$reason', ({ payload, expected }) => {
    expect(getCmsListingContent(payload)).toEqual(expected)
  })
})
