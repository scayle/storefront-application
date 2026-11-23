import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CMSPageData } from '@shared/types/cms/amplience'
import { PRODUCTION_MEDIA_HOST } from '../utils/media'
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

const page = (overrides: Record<string, unknown> = {}) =>
  ({
    _meta: {
      schema: 'https://scayle.com/schemas/page-component.json',
      deliveryId: 'page-delivery-id',
      deliveryKey: 'en-GB/homepage',
    },
    components: [textBlock('First block'), textBlock('Second block')],
    ...overrides,
  }) as unknown as CMSPageData

const mountPage = (data: CMSPageData = page()) =>
  mount(PageComponent, { props: { data } })

describe('Amplience PageComponent', () => {
  beforeEach(() => {
    // Reset here rather than at the end of the test that sets it, so a failure
    // there cannot leave the editor session on for the rest of the file.
    sharedProps.cmsEditorData = undefined
    changedMock.mockClear()
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
    const wrapper = mountPage(page({ components: undefined }))

    expect(wrapper.find('section').exists()).toBe(true)
    expect(wrapper.find('section').text()).toBe('')
  })

  it('renders the provider CmsHead so the media CDN is preconnected', () => {
    const head = mountPage().get('[data-testid="inertia-head"]')

    expect(head.get('link').attributes('href')).toBe(
      `https://${PRODUCTION_MEDIA_HOST}`,
    )
  })

  it('annotates the entry so the Amplience editor can highlight the field', () => {
    const section = mountPage().get('section')

    expect(section.attributes('data-amplience-entry-id')).toBe(
      'page-delivery-id',
    )
    expect(section.attributes('data-amplience-field-id')).toBe('components')
  })

  it('re-renders with the blocks the editor emits while typing', async () => {
    sharedProps.cmsEditorData = { vse: 'abc.staging.bigcontent.io' }

    const wrapper = mountPage()
    await flushPromises()

    changedMock.mock.calls[0]![0]({
      content: page({ components: [textBlock('Draft')] }),
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Draft')
    expect(wrapper.text()).not.toContain('First block')
  })

  it('renders the new payload when the page prop changes', async () => {
    const wrapper = mountPage()

    await wrapper.setProps({ data: page({ components: [textBlock('Next')] }) })

    expect(wrapper.text()).toContain('Next')
  })

  it('provides an LCP claim so the first image can mark itself high priority', () => {
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

    const img = mountPage(page({ components: [imageBlock] })).find('img')

    expect(img.attributes('fetchpriority')).toBe('high')
  })
})
