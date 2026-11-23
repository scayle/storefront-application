import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createDeferredStub } from '@test/utils/deferredStub'
import type { ContentstackBlock } from '@shared/types/cms/contentstack'
import { vLivePreview } from '../directives/livePreview'
import ContentstackBlockDispatch from './ContentstackBlockDispatch.vue'

const cmsDirectives = { 'live-preview': vLivePreview }

// isomorphic-dompurify loads jsdom internally which conflicts with happy-dom.
// Component tests do not need real HTML sanitization.
vi.mock('@client/cms/shared/richtext', () => ({
  sanitizeCmsHtml: (html: string) => html,
}))

const blockOf = (contentTypeUid: string) =>
  ({
    uid: 'block-1',
    _content_type_uid: contentTypeUid,
    title: 'Block',
  }) as ContentstackBlock

describe('ContentstackBlockDispatch', () => {
  it('renders divider blocks', () => {
    const wrapper = mount(ContentstackBlockDispatch, {
      props: {
        contentElement: {
          uid: 'divider-1',
          _content_type_uid: 'divider-component',
          title: 'Divider',
          height: 'small',
          /** DividerComponent only renders `<hr>` when this flag is set. */
          show_line: true,
        },
      },
      global: { directives: cmsDirectives },
    })

    expect(wrapper.find('hr').exists()).toBe(true)
  })

  // Stubbed by name, so each row proves the dispatcher picks the right branch
  // without depending on what the target component needs to render.
  it.for([
    ['accordion-component', 'AccordionComponent'],
    ['accordion_item-component', 'AccordionItemComponent'],
    ['grid-component', 'GridComponent'],
    ['image-component', 'ImageComponent'],
    ['link-component', 'LinkComponent'],
    ['slider-component', 'SliderComponent'],
    ['video-component', 'VideoComponent'],
    ['button-component', 'ButtonComponent'],
    ['countdown_timer-component', 'CountdownTimerComponent'],
  ] as const)('routes %s blocks to %s', ([contentTypeUid, componentName]) => {
    const wrapper = mount(ContentstackBlockDispatch, {
      props: {
        contentElement: {
          uid: 'block-1',
          _content_type_uid: contentTypeUid,
          title: 'Block',
        } as ContentstackBlock,
      },
      global: {
        directives: cmsDirectives,
        stubs: {
          [componentName]: { template: '<div data-testid="routed" />' },
        },
      },
    })

    expect(wrapper.find('[data-testid="routed"]').exists()).toBe(true)
  })

  it('renders section blocks with nested content', () => {
    const wrapper = mount(ContentstackBlockDispatch, {
      props: {
        contentElement: {
          uid: 'section-1',
          _content_type_uid: 'section-component',
          title: 'Section',
          content: [
            {
              uid: 'text-2',
              _content_type_uid: 'text-component',
              title: 'Nested Text',
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
    const wrapper = mount(ContentstackBlockDispatch, {
      props: {
        contentElement: {
          uid: 'text-3',
          _content_type_uid: 'text-component',
          title: 'Text',
          content: 'Spaced',
        },
      },
      attrs: { class: 'mt-auto' },
      global: { directives: cmsDirectives },
    })

    expect(wrapper.classes()).toContain('mt-auto')
  })

  it('forwards fallthrough attrs to the not-implemented message', () => {
    const wrapper = mount(ContentstackBlockDispatch, {
      props: {
        contentElement: {
          uid: 'unknown-1',
          _content_type_uid: 'something_new-component',
          title: 'Unknown',
        } as unknown as ContentstackBlock,
      },
      attrs: { class: 'mt-auto' },
      global: { directives: cmsDirectives },
    })

    expect(wrapper.classes()).toContain('mt-auto')
  })

  it('reports an unimplemented content type by name in dev and test builds', () => {
    const wrapper = mount(ContentstackBlockDispatch, {
      props: {
        contentElement: {
          uid: 'unknown-1',
          _content_type_uid: 'something_new-component',
          title: 'Unknown',
        } as unknown as ContentstackBlock,
      },
      global: { directives: cmsDirectives },
    })

    expect(wrapper.text()).toContain('something_new-component')
    expect(wrapper.text()).toContain('is not implemented')
  })

  it.for(['constructor', 'toString', 'valueOf', '__proto__'])(
    'reports %s as unimplemented instead of resolving it on the prototype chain',
    (contentTypeUid) => {
      const wrapper = mount(ContentstackBlockDispatch, {
        props: { contentElement: blockOf(contentTypeUid) },
      })

      expect(wrapper.text()).toContain('is not implemented')
    },
  )

  const ASYNC_BLOCKS = [
    ['richtext-component', 'RichTextComponent'],
    [
      'smart_sorting_products_slider-component',
      'SmartSortingProductsSliderComponent',
    ],
    ['recentlyviewedproducts-component', 'RecentlyViewedProductsComponent'],
    ['single_product-component', 'SingleProductComponent'],
  ] as const

  it.for(ASYNC_BLOCKS)(
    'keeps a %s block behind Suspense until it resolves',
    async ([contentTypeUid, componentName]) => {
      const stub = createDeferredStub(contentTypeUid)
      const wrapper = mount(ContentstackBlockDispatch, {
        props: { contentElement: blockOf(contentTypeUid) },
        global: { stubs: { [componentName]: stub.component } },
      })

      expect(wrapper.find('[data-testid="routed"]').exists()).toBe(false)

      stub.resolve()
      await flushPromises()

      expect(wrapper.find('[data-testid="routed"]').text()).toBe(contentTypeUid)
    },
  )

  it('drops the previous async block while the next async block type is pending', async () => {
    const richText = createDeferredStub('Rich text')
    const singleProduct = createDeferredStub('Single product')
    const wrapper = mount(ContentstackBlockDispatch, {
      props: { contentElement: blockOf('richtext-component') },
      global: {
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
      contentElement: blockOf('single_product-component'),
    })

    expect(wrapper.text()).toBe('')

    singleProduct.resolve()
    await flushPromises()

    expect(wrapper.text()).toBe('Single product')
  })

  it('forwards fallthrough attrs to an async block', async () => {
    const richText = createDeferredStub('Rich text')
    richText.resolve()
    const wrapper = mount(ContentstackBlockDispatch, {
      props: { contentElement: blockOf('richtext-component') },
      attrs: { class: 'mt-auto' },
      global: { stubs: { RichTextComponent: richText.component } },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="routed"]').classes()).toContain(
      'mt-auto',
    )
  })
})
