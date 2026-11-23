import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createDeferredStub } from '@test/utils/deferredStub'
import type { ContentfulContentElement } from '@shared/types/cms/contentful'
import ContentfulBlockDispatch from './ContentfulBlockDispatch.vue'

// isomorphic-dompurify loads jsdom internally which conflicts with happy-dom.
// Component tests do not need real HTML sanitization.
vi.mock('@client/cms/shared/richtext', () => ({
  sanitizeCmsHtml: (html: string) => html,
}))

/**
 * Builds the minimum entry shape the generated `isType*` guards narrow on: they
 * read `sys.contentType.sys.id` alone, so the content type id plus the fields
 * the target component renders is enough.
 */
const entry = (contentTypeId: string, fields: Record<string, unknown> = {}) =>
  ({
    sys: {
      id: `${contentTypeId}-1`,
      contentType: { sys: { id: contentTypeId } },
    },
    fields,
  }) as unknown as ContentfulContentElement

describe('ContentfulBlockDispatch', () => {
  it('renders divider blocks', () => {
    const wrapper = mount(ContentfulBlockDispatch, {
      props: {
        contentElement: entry('DividerComponent', {
          height: 'small',
          // DividerComponent only renders `<hr>` when this flag is set.
          showLine: true,
        }),
      },
    })

    expect(wrapper.find('hr').exists()).toBe(true)
  })

  // Stubbed by name, so each row proves the dispatcher picks the right
  // component without depending on what it needs to render. The async blocks
  // are covered by the deferred-stub tests below.
  it.for([
    'AccordionComponent',
    'ButtonComponent',
    'CountdownTimerComponent',
    'GridComponent',
    'ImageComponent',
    'LinkComponent',
    'SliderComponent',
    'VideoComponent',
  ])('routes %s blocks to the matching component', (contentTypeId) => {
    const wrapper = mount(ContentfulBlockDispatch, {
      props: { contentElement: entry(contentTypeId) },
      global: {
        stubs: {
          [contentTypeId]: {
            props: ['contentElement'],
            template: `<div data-testid="routed">{{ contentElement.sys.id }}</div>`,
          },
        },
      },
    })

    expect(wrapper.find('[data-testid="routed"]').text()).toBe(
      `${contentTypeId}-1`,
    )
  })

  it('renders section blocks with nested content', () => {
    const wrapper = mount(ContentfulBlockDispatch, {
      props: {
        contentElement: entry('SectionComponent', {
          content: [entry('TextComponent', { content: 'Nested text block' })],
        }),
      },
    })

    expect(wrapper.text()).toContain('Nested text block')
  })

  it('renders accordion item blocks, which no content array reaches directly', () => {
    // Only `AccordionComponent` nests these, so a page's top-level content
    // array never reaches this type and it needs its own case.
    const wrapper = mount(ContentfulBlockDispatch, {
      props: {
        contentElement: entry('AccordionItemComponent', {
          title: 'Delivery',
          content: [entry('TextComponent', { content: 'Ships in two days' })],
        }),
      },
    })

    expect(wrapper.text()).toContain('Delivery')
    expect(wrapper.text()).toContain('Ships in two days')
  })

  it('forwards fallthrough attrs, which SectionComponent relies on for block spacing', () => {
    const wrapper = mount(ContentfulBlockDispatch, {
      props: {
        contentElement: entry('TextComponent', { content: 'Spaced' }),
      },
      attrs: { class: 'mt-auto' },
    })

    expect(wrapper.classes()).toContain('mt-auto')
  })

  it('renders nothing for an absent entry', () => {
    // The prop is optional: a grid or section cell whose reference the author
    // deleted arrives as `undefined` after link resolution. That is not a
    // missing block type, so the dev-only message stays out.
    const wrapper = mount(ContentfulBlockDispatch, {
      props: { contentElement: undefined },
    })

    expect(wrapper.text()).toBe('')
  })

  it('reports an unimplemented content type by name in dev and test builds', () => {
    const wrapper = mount(ContentfulBlockDispatch, {
      props: { contentElement: entry('SomethingNewComponent') },
    })

    expect(wrapper.text()).toContain('SomethingNewComponent')
    expect(wrapper.text()).toContain('is not implemented')
  })

  it('forwards fallthrough attrs to the not-implemented message', () => {
    const wrapper = mount(ContentfulBlockDispatch, {
      props: { contentElement: entry('SomethingNewComponent') },
      attrs: { class: 'mt-auto' },
    })

    expect(wrapper.classes()).toContain('mt-auto')
  })

  // Contentful content type ids differ from the component names for these
  // blocks, so each row pairs the id the guard reads with the stub name.
  const ASYNC_BLOCKS = [
    ['RichTextComponent', 'RichTextComponent'],
    ['productSliderComponent', 'ProductSliderComponent'],
    [
      'smartSortingProductsSliderComponent',
      'SmartSortingProductsSliderComponent',
    ],
    ['RecentlyViewedProductsComponent', 'RecentlyViewedProductsComponent'],
    ['singleProduct', 'SingleProductComponent'],
  ] as const

  it.for(ASYNC_BLOCKS)(
    'keeps a %s block behind Suspense until it resolves',
    async ([contentTypeId, componentName]) => {
      const stub = createDeferredStub(contentTypeId)
      const wrapper = mount(ContentfulBlockDispatch, {
        props: { contentElement: entry(contentTypeId) },
        global: { stubs: { [componentName]: stub.component } },
      })

      expect(wrapper.find('[data-testid="routed"]').exists()).toBe(false)

      stub.resolve()
      await flushPromises()

      expect(wrapper.find('[data-testid="routed"]').text()).toBe(contentTypeId)
    },
  )

  it('drops the previous async block while the next async block type is pending', async () => {
    const richText = createDeferredStub('Rich text')
    const productSlider = createDeferredStub('Product slider')
    const wrapper = mount(ContentfulBlockDispatch, {
      props: { contentElement: entry('RichTextComponent') },
      global: {
        stubs: {
          RichTextComponent: richText.component,
          ProductSliderComponent: productSlider.component,
        },
      },
    })
    richText.resolve()
    await flushPromises()
    expect(wrapper.text()).toBe('Rich text')

    await wrapper.setProps({ contentElement: entry('productSliderComponent') })

    expect(wrapper.text()).toBe('')

    productSlider.resolve()
    await flushPromises()

    expect(wrapper.text()).toBe('Product slider')
  })

  it('forwards fallthrough attrs to an async block', async () => {
    const richText = createDeferredStub('Rich text')
    richText.resolve()
    const wrapper = mount(ContentfulBlockDispatch, {
      props: { contentElement: entry('RichTextComponent') },
      attrs: { class: 'mt-auto' },
      global: { stubs: { RichTextComponent: richText.component } },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="routed"]').classes()).toContain(
      'mt-auto',
    )
  })
})
