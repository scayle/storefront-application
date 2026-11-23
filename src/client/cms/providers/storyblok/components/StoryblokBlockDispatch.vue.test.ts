import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createDeferredStub } from '@test/utils/deferredStub'
import type { StoryblokBlock } from '@shared/types/cms/storyblok'
import { vEditable } from '../directives/editable'
import StoryblokBlockDispatch from './StoryblokBlockDispatch.vue'

const cmsDirectives = { editable: vEditable }

// isomorphic-dompurify loads jsdom internally which conflicts with happy-dom.
// Component tests do not need real HTML sanitization.
vi.mock('@client/cms/shared/richtext', () => ({
  sanitizeCmsHtml: (html: string) => html,
}))

const blockOf = (component: string) =>
  ({ _uid: `${component}-1`, component }) as StoryblokBlock

describe('StoryblokBlockDispatch', () => {
  it('renders divider blocks', () => {
    const wrapper = mount(StoryblokBlockDispatch, {
      props: {
        contentElement: {
          _uid: 'divider-1',
          component: 'DividerComponent',
          height: 'small',
          /** DividerComponent only renders `<hr>` when this flag is set. */
          showLine: true,
        },
      },
      global: { directives: cmsDirectives },
    })

    expect(wrapper.find('hr').exists()).toBe(true)
  })

  // Each child is stubbed by its binding name, so an entry that sends the block
  // to the wrong component, or drops it, finds no stub to render. These stubs
  // render synchronously, so the Suspense blocks are covered by the deferred
  // stub tests below.
  it.for([
    'AccordionComponent',
    'AccordionItemComponent',
    'GridComponent',
    'ImageComponent',
    'LinkComponent',
    'SliderComponent',
    'VideoComponent',
    'ButtonComponent',
    'CountdownTimerComponent',
  ] as const)('routes %s blocks to the matching component', (component) => {
    const wrapper = mount(StoryblokBlockDispatch, {
      props: {
        contentElement: { _uid: `${component}-1`, component } as StoryblokBlock,
      },
      global: {
        directives: cmsDirectives,
        stubs: {
          [component]: {
            props: ['contentElement'],
            template:
              '<div data-testid="routed">{{ contentElement._uid }}</div>',
          },
        },
      },
    })

    expect(wrapper.find('[data-testid="routed"]').text()).toBe(`${component}-1`)
  })

  it('renders section blocks with nested content', () => {
    const wrapper = mount(StoryblokBlockDispatch, {
      props: {
        contentElement: {
          _uid: 'section-1',
          component: 'SectionComponent',
          content: [
            {
              _uid: 'text-2',
              component: 'TextComponent',
              content: 'Nested text block',
            },
          ],
        },
      },
      global: { directives: cmsDirectives },
    })

    expect(wrapper.text()).toContain('Nested text block')
  })

  it('forwards fallthrough attrs, which SectionComponent relies on for block spacing', () => {
    const wrapper = mount(StoryblokBlockDispatch, {
      props: {
        contentElement: {
          _uid: 'text-3',
          component: 'TextComponent',
          content: 'Spaced',
        },
      },
      attrs: { class: 'mt-auto' },
      global: { directives: cmsDirectives },
    })

    expect(wrapper.classes()).toContain('mt-auto')
  })

  it('reports an unimplemented block type by name in dev and test builds', () => {
    const wrapper = mount(StoryblokBlockDispatch, {
      props: {
        contentElement: blockOf('SomethingNew'),
      },
      global: { directives: cmsDirectives },
    })

    expect(wrapper.text()).toContain('SomethingNew')
    expect(wrapper.text()).toContain('is not implemented')
  })

  it('forwards fallthrough attrs to the not-implemented message', () => {
    const wrapper = mount(StoryblokBlockDispatch, {
      props: {
        contentElement: blockOf('SomethingNew'),
      },
      attrs: { class: 'mt-auto' },
      global: { directives: cmsDirectives },
    })

    expect(wrapper.classes()).toContain('mt-auto')
  })

  it.for(['constructor', 'toString', 'valueOf', '__proto__'])(
    'reports %s as unimplemented instead of resolving it on the prototype chain',
    (component) => {
      const wrapper = mount(StoryblokBlockDispatch, {
        props: { contentElement: blockOf(component) },
        global: { directives: cmsDirectives },
      })

      expect(wrapper.text()).toContain('is not implemented')
    },
  )

  it.for([
    'RichTextComponent',
    'RecentlyViewedProductsComponent',
    'ProductSliderComponent',
    'SingleProductComponent',
    'SmartSortingProductsSliderComponent',
  ] as const)(
    'keeps a %s block behind Suspense until it resolves',
    async (component) => {
      const stub = createDeferredStub(component)
      const wrapper = mount(StoryblokBlockDispatch, {
        props: { contentElement: blockOf(component) },
        global: {
          directives: cmsDirectives,
          stubs: { [component]: stub.component },
        },
      })

      expect(wrapper.find('[data-testid="routed"]').exists()).toBe(false)

      stub.resolve()
      await flushPromises()

      expect(wrapper.find('[data-testid="routed"]').text()).toBe(component)
    },
  )

  it('drops the previous async block while the next async block type is pending', async () => {
    const richText = createDeferredStub('Rich text')
    const singleProduct = createDeferredStub('Single product')
    const wrapper = mount(StoryblokBlockDispatch, {
      props: { contentElement: blockOf('RichTextComponent') },
      global: {
        directives: cmsDirectives,
        stubs: {
          RichTextComponent: richText.component,
          SingleProductComponent: singleProduct.component,
        },
      },
    })
    richText.resolve()
    await flushPromises()
    expect(wrapper.text()).toBe('Rich text')

    await wrapper.setProps({
      contentElement: blockOf('SingleProductComponent'),
    })

    expect(wrapper.text()).toBe('')

    singleProduct.resolve()
    await flushPromises()

    expect(wrapper.text()).toBe('Single product')
  })

  it('forwards fallthrough attrs to an async block', async () => {
    const richText = createDeferredStub('Rich text')
    richText.resolve()
    const wrapper = mount(StoryblokBlockDispatch, {
      props: { contentElement: blockOf('RichTextComponent') },
      attrs: { class: 'mt-auto' },
      global: {
        directives: cmsDirectives,
        stubs: { RichTextComponent: richText.component },
      },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="routed"]').classes()).toContain(
      'mt-auto',
    )
  })
})
