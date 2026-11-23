import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CMSPageData } from '@shared/types/cms/contentstack'
import { vLivePreview } from '../directives/livePreview'
import PageComponent from './PageComponent.vue'

const cmsDirectives = { 'live-preview': vLivePreview }

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

const onEntryChangeMock = vi.hoisted(() => vi.fn(() => 'callback-id' as string))

vi.mock('@contentstack/live-preview-utils', () => ({
  default: {
    init: vi.fn(),
    onEntryChange: onEntryChangeMock,
    unsubscribeOnEntryChange: vi.fn(),
  },
}))

const textBlock = (uid: string, content: string) => ({
  uid,
  _content_type_uid: 'text-component',
  title: 'Text',
  content,
})

/** Builds a page payload; pass an empty entry to model a page with no blocks. */
const page = (
  entry: Record<string, unknown> = {
    content: [
      textBlock('text-1', 'First block'),
      textBlock('text-2', 'Second block'),
    ],
  },
) =>
  ({
    entry: {
      uid: 'page-1',
      _content_type_uid: 'page-component',
      title: 'Home',
      ...entry,
    },
  }) as unknown as CMSPageData

const pageWithBlocks = (content: unknown[]) => page({ content })

const mountPage = (data: CMSPageData = page()) =>
  mount(PageComponent, {
    props: { data },
    global: { directives: cmsDirectives },
  })

describe('Contentstack PageComponent', () => {
  beforeEach(() => {
    // Reset here rather than at the end of the test that sets it, so a failure
    // there cannot leave the editor session on for the rest of the file.
    sharedProps.cmsEditorData = undefined
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
      'https://images.contentstack.io',
    )
  })

  it('annotates the section with the live-preview attribute of the content field', () => {
    const wrapper = mountPage(
      page({
        $: { content: { 'data-cslp': 'page-component.page-1.content' } },
      }),
    )

    expect(wrapper.get('section').attributes('data-cslp')).toBe(
      'page-component.page-1.content',
    )
  })

  it('subscribes to editor changes only inside an editor session', async () => {
    mountPage()
    await flushPromises()
    expect(onEntryChangeMock).not.toHaveBeenCalled()

    sharedProps.cmsEditorData = { apiKey: 'key', environment: 'production' }
    mountPage()
    await flushPromises()

    expect(onEntryChangeMock).toHaveBeenCalledOnce()
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
      uid: 'image-1',
      _content_type_uid: 'image-component',
      title: 'Hero',
      alt_text: 'Hero',
      image_desktop: { url: 'https://images.contentstack.io/hero.jpg' },
    }

    const img = mountPage(pageWithBlocks([imageBlock])).find('img')

    expect(img.attributes('src')).toBe(
      'https://images.contentstack.io/hero.jpg',
    )
    expect(img.attributes('fetchpriority')).toBe('high')
  })
})
