import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CMSPageData } from '@shared/types/cms/contentful'
import PageComponent from './PageComponent.vue'

// Mutable so the live-preview case can switch the editor session on.
const sharedProps = vi.hoisted(() => ({
  cmsEditorData: undefined as Record<string, unknown> | undefined,
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: sharedProps }),
  Head: defineComponent({
    setup(_, { slots }) {
      return () =>
        h('div', { 'data-testid': 'inertia-head' }, slots.default?.())
    },
  }),
}))

vi.mock('@client/composables/useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    country: computed(() => ({ locale: 'de-DE' })),
  }),
}))

const subscribeMock = vi.hoisted(() =>
  vi.fn((_config: { callback: (update: unknown) => void }) => vi.fn()),
)

vi.mock('@contentful/live-preview', () => ({
  ContentfulLivePreview: { init: vi.fn(), subscribe: subscribeMock },
}))

vi.mock('contentful-resolve-response', () => ({
  default: (response: { items: unknown[] }) => response.items,
}))

const textBlock = (id: string, content: string) => ({
  sys: { id, contentType: { sys: { id: 'TextComponent' } } },
  fields: { content },
})

/** Builds a page payload; pass empty `fields` to model a page with no blocks. */
const page = (
  fields: Record<string, unknown> = {
    content: [
      textBlock('text-1', 'First block'),
      textBlock('text-2', 'Second block'),
    ],
  },
) =>
  ({
    entry: {
      sys: { id: 'page-1', contentType: { sys: { id: 'PageComponent' } } },
      fields,
    },
  }) as unknown as CMSPageData

const pageWithBlocks = (content: unknown[]) => page({ content })

const mountPage = (data: CMSPageData = page()) =>
  mount(PageComponent, { props: { data } })

describe('Contentful PageComponent', () => {
  beforeEach(() => {
    // Reset here rather than at the end of the test that sets it, so a failure
    // there cannot leave the editor session on for the rest of the file.
    sharedProps.cmsEditorData = undefined
    subscribeMock.mockClear()
  })

  it('renders the page blocks in authored order', () => {
    const text = mountPage().text()

    expect(text).toContain('First block')
    expect(text).toContain('Second block')
    expect(text.indexOf('First block')).toBeLessThan(
      text.indexOf('Second block'),
    )
  })

  it('renders an empty section when the page has no blocks yet', () => {
    const wrapper = mountPage(page({}))

    expect(wrapper.find('section').exists()).toBe(true)
    expect(wrapper.find('section').text()).toBe('')
  })

  it('renders the provider CmsHead so the image CDN is preconnected', () => {
    const head = mountPage().get('[data-testid="inertia-head"]')

    expect(head.get('link').attributes('href')).toBe(
      'https://images.ctfassets.net',
    )
  })

  it('annotates the entry so the Contentful editor can highlight the field', () => {
    const section = mountPage().get('section')

    expect(section.attributes('data-contentful-entry-id')).toBe('page-1')
    expect(section.attributes('data-contentful-field-id')).toBe('content')
  })

  it('re-renders with the entry the live preview emits while typing', async () => {
    sharedProps.cmsEditorData = { isPreviewEnabled: true }

    const data = page()
    data.previewSource = {
      entry: data.entry,
    } as CMSPageData['previewSource']

    const wrapper = mount(PageComponent, { props: { data } })
    await flushPromises()

    subscribeMock.mock.calls[0]![0].callback({
      sys: { id: 'page-1' },
      fields: { content: [textBlock('text-3', 'Draft')] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Draft')
    expect(wrapper.text()).not.toContain('First block')
  })

  it('renders the new payload when the page prop changes', async () => {
    const wrapper = mountPage()

    await wrapper.setProps({
      data: pageWithBlocks([textBlock('text-3', 'Next')]),
    })

    expect(wrapper.text()).toContain('Next')
  })

  it('provides an LCP claim so the first image can mark itself high priority', () => {
    const imageBlock = {
      sys: { id: 'image-1', contentType: { sys: { id: 'ImageComponent' } } },
      fields: {
        altText: 'Hero',
        imageDesktop: {
          fields: { file: { url: '//images.ctfassets.net/hero.jpg' } },
        },
      },
    }

    const img = mountPage(pageWithBlocks([imageBlock])).find('img')

    expect(img.attributes('fetchpriority')).toBe('high')
  })
})
