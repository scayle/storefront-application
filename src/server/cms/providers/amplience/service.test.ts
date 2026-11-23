import { describe, expect, it, vi } from 'vitest'
import type { CMSPageData } from '@shared/types/cms/amplience'
import type { IncomingRequest } from '@scayle/storefront'
import { createMockStorefrontContext } from '@test/utils/context'
import { createCMSService, getPageMeta } from './service'

const PAGE_SCHEMA = 'https://scayle.com/schemas/page-component.json'
const PLP_SCHEMA =
  'https://scayle.com/schemas/product-listing-page-component.json'

const mockContext = createMockStorefrontContext()

describe('getPageMeta', () => {
  it('reads the SEO fields off a page content item', () => {
    const data = {
      _meta: { schema: PAGE_SCHEMA },
      metaTitle: 'About us',
      metaDescription: 'Who we are',
      robots: 'index,follow',
    } as unknown as CMSPageData

    expect(getPageMeta(data)).toEqual({
      title: 'About us',
      description: 'Who we are',
      robots: 'index,follow',
    })
  })

  it('leaves absent fields undefined rather than emitting empty strings', () => {
    const data = { _meta: { schema: PAGE_SCHEMA } } as unknown as CMSPageData

    expect(getPageMeta(data)).toEqual({
      title: undefined,
      description: undefined,
      robots: undefined,
    })
  })

  it('returns undefined for a listing page, which carries no meta fields', () => {
    const data = {
      _meta: { schema: PLP_SCHEMA },
      teaser_content: [],
    } as unknown as CMSPageData

    expect(getPageMeta(data)).toBeUndefined()
  })

  it('returns undefined when the payload has no schema to identify it', () => {
    expect(getPageMeta({} as CMSPageData)).toBeUndefined()
    expect(getPageMeta({ _meta: {} } as unknown as CMSPageData)).toBeUndefined()
  })

  it('ignores non-string field values from a hand-edited content item', () => {
    const data = {
      _meta: { schema: PAGE_SCHEMA },
      metaTitle: 42,
      robots: null,
    } as unknown as CMSPageData

    expect(getPageMeta(data)).toEqual({
      title: undefined,
      description: undefined,
      robots: undefined,
    })
  })
})

describe('createCMSService', () => {
  /** An editor request: `getCMSEditorData` answers only when drafts are enabled. */
  const editorRequest = {
    headers: {},
    query: { vse: 'abc.staging.bigcontent.io' },
    originalIp: undefined,
    session: {},
  } as unknown as IncomingRequest

  it('names the missing variable when the hub name is not configured', () => {
    vi.stubEnv('AMPLIENCE_CMS_HUB_NAME', undefined)

    expect(() => createCMSService(mockContext)).toThrow(
      /AMPLIENCE_CMS_HUB_NAME/,
    )
  })

  it('enables draft content when STOREFRONT_CMS_ALLOW_DRAFTS is true', () => {
    vi.stubEnv('AMPLIENCE_CMS_HUB_NAME', 'test-hub')
    vi.stubEnv('STOREFRONT_CMS_ALLOW_DRAFTS', 'True')

    expect(
      createCMSService(mockContext).getCMSEditorData(editorRequest),
    ).toEqual({ vse: 'abc.staging.bigcontent.io', deliveryKey: undefined })
  })

  it('leaves draft content disabled for any other value', () => {
    vi.stubEnv('AMPLIENCE_CMS_HUB_NAME', 'test-hub')
    vi.stubEnv('STOREFRONT_CMS_ALLOW_DRAFTS', 'false')

    expect(
      createCMSService(mockContext).getCMSEditorData(editorRequest),
    ).toBeUndefined()

    vi.stubEnv('STOREFRONT_CMS_ALLOW_DRAFTS', undefined)

    expect(
      createCMSService(mockContext).getCMSEditorData(editorRequest),
    ).toBeUndefined()
  })
})
