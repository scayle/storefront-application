import { describe, expect, it } from 'vitest'
import {
  createMockIncomingRequest,
  createMockStorefrontContext,
} from '../../../../test/utils/context'
import { createCMSService, getPageMeta } from './service'

const request = createMockIncomingRequest({
  url: 'https://shop.example.com/de/content/about?_storyblok=1',
})

describe('scayle CMS placeholder provider', () => {
  it('stays out of editor mode even for a request carrying preview params', () => {
    const service = createCMSService(createMockStorefrontContext())

    expect(service.isEditorMode(request)).toBe(false)
    expect(service.getCMSEditorData(request)).toBeUndefined()
  })

  it('returns placeholder content for any slug, so the CMS page still renders', async () => {
    const service = createCMSService(createMockStorefrontContext())

    await expect(service.fetchPageData('about', request)).resolves.toEqual({
      headline: expect.any(String),
      description: expect.any(String),
    })
  })

  it('keeps the placeholder page out of search indexes', () => {
    expect(getPageMeta({ headline: 'ignored' })).toMatchObject({
      robots: 'noindex, nofollow',
    })
  })
})
