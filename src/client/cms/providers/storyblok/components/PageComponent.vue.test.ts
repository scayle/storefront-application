import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CMSPageData } from '@shared/types/cms/storyblok'
import { vEditable } from '../directives/editable'
import PageComponent from './PageComponent.vue'

const cmsDirectives = { editable: vEditable }

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

const bridge = vi.hoisted(() => ({
  loadStoryblokBridge: vi.fn(),
  useStoryblokBridge: vi.fn(),
}))

vi.mock('@storyblok/js', () => bridge)

const textBlock = (uid: string, content: string) => ({
  _uid: uid,
  component: 'TextComponent',
  content,
})

/** Builds a story payload; pass an empty content blok to model an empty page. */
const page = (
  content: Record<string, unknown> = {
    content: [
      textBlock('text-1', 'First block'),
      textBlock('text-2', 'Second block'),
    ],
  },
) =>
  ({
    story: {
      id: 42,
      full_slug: 'en-gb/home',
      content: { _uid: 'page-1', component: 'PageComponent', ...content },
    },
  }) as unknown as CMSPageData

const pageWithBlocks = (blocks: unknown[]) => page({ content: blocks })

const mountPage = (data: CMSPageData = page()) =>
  mount(PageComponent, {
    props: { data },
    global: { directives: cmsDirectives },
  })

describe('Storyblok PageComponent', () => {
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

  it('renders an empty section when the content field is not an array', () => {
    // A blok field edited from single to multiple in the component schema can
    // still deliver the old single-object shape on stories saved before.
    const wrapper = mountPage(page({ content: textBlock('text-1', 'Alone') }))

    expect(wrapper.find('section').text()).toBe('')
  })

  it('renders the provider CmsHead so the image CDN is preconnected', () => {
    const head = mountPage().get('[data-testid="inertia-head"]')

    expect(head.get('link').attributes('href')).toBe('https://a.storyblok.com')
  })

  it('re-renders with the story the Visual Editor emits while typing', async () => {
    sharedProps.cmsEditorData = { isPreviewEnabled: true }

    const wrapper = mountPage()
    await flushPromises()

    const onStoryUpdate = bridge.useStoryblokBridge.mock.calls[0]![1] as (
      story: unknown,
    ) => void
    onStoryUpdate({
      id: 42,
      content: {
        _uid: 'page-1',
        component: 'PageComponent',
        content: [textBlock('text-3', 'Draft')],
      },
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
      _uid: 'image-1',
      component: 'ImageComponent',
      altText: 'Hero',
      imageDesktop: { filename: 'https://a.storyblok.com/f/1/hero.jpg' },
    }

    const img = mountPage(pageWithBlocks([imageBlock])).find('img')

    expect(img.attributes('fetchpriority')).toBe('high')
  })
})
