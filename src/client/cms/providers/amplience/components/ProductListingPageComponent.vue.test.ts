import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CMSPageData } from '@shared/types/cms/amplience'
import ProductListingPageComponent from './ProductListingPageComponent.vue'

// Mutable so the live-preview case can switch the editor session on.
const sharedProps = vi.hoisted(() => ({
  cmsEditorData: undefined as Record<string, unknown> | undefined,
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: sharedProps }),
  Head: defineComponent({
    setup(_, { slots }) {
      return () => h('div', slots.default?.())
    },
  }),
}))

const changedMock = vi.hoisted(() =>
  vi.fn((_callback: (model: { content: unknown }) => void) => vi.fn()),
)

vi.mock('dc-visualization-sdk', () => ({
  init: async () => ({ form: { changed: changedMock } }),
}))

const textBlock = (content: string) => ({
  componentType: 'text',
  text: { _meta: { schema: 'x' }, content },
})

const listingPage = {
  _meta: {
    schema: 'https://scayle.com/schemas/product-listing-page-component.json',
    deliveryId: 'plp-1',
  },
  teaser_content: [textBlock('Above the grid')],
  seo_content: [textBlock('Below the grid')],
} as unknown as CMSPageData

const mountListing = (
  contentType: 'teaser' | 'seo',
  data: CMSPageData = listingPage,
) => mount(ProductListingPageComponent, { props: { data, contentType } })

describe('Amplience ProductListingPageComponent', () => {
  beforeEach(() => {
    // Reset here rather than at the end of the test that sets it, so a failure
    // there cannot leave the editor session on for the rest of the file.
    sharedProps.cmsEditorData = undefined
    changedMock.mockClear()
  })

  it('renders only the teaser blocks above the grid', () => {
    const text = mountListing('teaser').text()

    expect(text).toContain('Above the grid')
    expect(text).not.toContain('Below the grid')
  })

  it('renders only the SEO blocks below the grid', () => {
    const text = mountListing('seo').text()

    expect(text).toContain('Below the grid')
    expect(text).not.toContain('Above the grid')
  })

  it('renders nothing for a category with no CMS content, which is the common case', () => {
    const wrapper = mountListing('teaser', {} as CMSPageData)

    expect(wrapper.text()).toBe('')
  })

  it('renders nothing when handed a content page instead of a listing page', () => {
    const contentPage = {
      _meta: { schema: 'https://scayle.com/schemas/page-component.json' },
      components: [textBlock('Content page block')],
    } as unknown as CMSPageData

    expect(mountListing('teaser', contentPage).text()).toBe('')
  })

  // A listing page renders this component twice, so both the teaser and the
  // SEO instance have to follow the editor.
  it.for([
    { contentType: 'teaser', field: 'teaser_content' },
    { contentType: 'seo', field: 'seo_content' },
  ] as const)(
    're-renders the $contentType block with the $field the editor emits while typing',
    async ({ contentType, field }) => {
      sharedProps.cmsEditorData = { vse: 'abc.staging.bigcontent.io' }

      const wrapper = mountListing(contentType)
      await flushPromises()

      changedMock.mock.calls[0]![0]({
        content: {
          ...listingPage,
          [field]: [textBlock(`Draft ${contentType}`)],
        },
      })
      await flushPromises()

      expect(wrapper.text()).toContain(`Draft ${contentType}`)
    },
  )

  it('renders the new payload when the page prop changes', async () => {
    const wrapper = mountListing('teaser')

    await wrapper.setProps({
      data: {
        ...listingPage,
        teaser_content: [textBlock('Next teaser')],
      } as unknown as CMSPageData,
    })

    expect(wrapper.text()).toContain('Next teaser')
  })

  it('lets the teaser hold the LCP image, since it renders above the fold', () => {
    const imageBlock = {
      componentType: 'image',
      image: {
        _meta: { schema: 'x' },
        alt_text: 'Hero',
        image_desktop: {
          id: 'a',
          name: 'hero',
          endpoint: 'scayle',
          defaultHost: 'cdn.media.amplience.net',
        },
      },
    }

    const img = mountListing('teaser', {
      ...listingPage,
      teaser_content: [imageBlock],
    } as unknown as CMSPageData).find('img')

    expect(img.attributes('fetchpriority')).toBe('high')
  })

  it('keeps SEO images lazy, since they render below the product grid', () => {
    const imageBlock = {
      componentType: 'image',
      image: {
        _meta: { schema: 'x' },
        alt_text: 'Editorial',
        image_desktop: {
          id: 'a',
          name: 'editorial',
          endpoint: 'scayle',
          defaultHost: 'cdn.media.amplience.net',
        },
      },
    }

    const img = mountListing('seo', {
      ...listingPage,
      seo_content: [imageBlock],
    } as unknown as CMSPageData).find('img')

    expect(img.attributes('fetchpriority')).toBe('auto')
    expect(img.attributes('loading')).toBe('lazy')
  })
})
