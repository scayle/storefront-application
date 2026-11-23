import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createDeferredStub } from '@test/utils/deferredStub'
import type { AmplienceBlock } from '@shared/types/cms/amplience'
import AmplienceBlockDispatch from './AmplienceBlockDispatch.vue'

// isomorphic-dompurify loads jsdom internally which conflicts with happy-dom.
// Component tests do not need real HTML sanitization.
vi.mock('@client/cms/shared/richtext', () => ({
  sanitizeCmsHtml: (html: string) => html,
}))

/** Casts a fixture to the block union without restating every schema field. */
const block = (value: unknown) => value as AmplienceBlock

describe('AmplienceBlockDispatch', () => {
  it('unwraps a text envelope and renders its payload', () => {
    const wrapper = mount(AmplienceBlockDispatch, {
      props: {
        contentElement: block({
          componentType: 'text',
          text: { content: 'Hello Amplience' },
        }),
      },
    })

    expect(wrapper.text()).toContain('Hello Amplience')
  })

  it('renders divider blocks', () => {
    const wrapper = mount(AmplienceBlockDispatch, {
      props: {
        contentElement: block({
          componentType: 'divider',
          // DividerComponent only renders `<hr>` when this flag is set.
          divider: { height: 'small', showLine: true },
        }),
      },
    })

    expect(wrapper.find('hr').exists()).toBe(true)
  })

  it('renders section blocks with nested content', () => {
    const wrapper = mount(AmplienceBlockDispatch, {
      props: {
        contentElement: block({
          componentType: 'section',
          section: {
            content: [
              {
                componentType: 'text',
                text: { content: 'Nested text block' },
              },
            ],
          },
        }),
      },
    })

    expect(wrapper.text()).toContain('Nested text block')
  })

  // Each child is stubbed by its binding name, so a branch that sends the
  // payload to the wrong component, or drops it, finds no stub to render. The
  // stub also replaces the async wrappers, which lets the Suspense branches
  // settle without loading the real product and rich text trees. The pending
  // state and the switch between async types are covered with deferred stubs
  // further down.
  it.for([
    ['grid', 'GridComponent'],
    ['image', 'ImageComponent'],
    ['link', 'LinkComponent'],
    ['richText', 'RichTextComponent'],
    ['slider', 'SliderComponent'],
    ['video', 'VideoComponent'],
    ['button', 'ButtonComponent'],
    ['countdownTimer', 'CountdownTimerComponent'],
    ['productSlider', 'ProductSliderComponent'],
    ['smartSorting', 'SmartSortingProductsSliderComponent'],
    ['recentlyViewed', 'RecentlyViewedProductsComponent'],
    ['singleProduct', 'SingleProductComponent'],
  ] as const)(
    'routes a %s envelope to %s with its payload',
    ([componentType, componentName]) => {
      const wrapper = mount(AmplienceBlockDispatch, {
        props: {
          contentElement: block({
            componentType,
            [componentType]: { marker: `${componentType} payload` },
          }),
        },
        global: {
          stubs: {
            [componentName]: {
              props: ['contentElement'],
              template: `<div data-testid="routed">{{ contentElement.marker }}</div>`,
            },
          },
        },
      })

      expect(wrapper.find('[data-testid="routed"]').text()).toBe(
        `${componentType} payload`,
      )
    },
  )

  it('renders accordion children, which arrive as bare payloads with no envelope', () => {
    const wrapper = mount(AmplienceBlockDispatch, {
      props: {
        contentElement: block({
          componentType: 'accordion',
          accordion: {
            content: [
              {
                title: 'Delivery',
                content: [
                  {
                    componentType: 'text',
                    text: { content: 'Ships in two days' },
                  },
                ],
              },
            ],
          },
        }),
      },
    })

    expect(wrapper.text()).toContain('Delivery')
    expect(wrapper.text()).toContain('Ships in two days')
  })

  it('forwards fallthrough attrs, which SectionComponent relies on for block spacing', () => {
    const wrapper = mount(AmplienceBlockDispatch, {
      props: {
        contentElement: block({
          componentType: 'text',
          text: { content: 'Spaced' },
        }),
      },
      attrs: { class: 'mt-auto' },
    })

    expect(wrapper.classes()).toContain('mt-auto')
  })

  it.for(['text', 'richText'])(
    'renders nothing for a %s envelope whose payload the author left empty',
    (componentType) => {
      const wrapper = mount(AmplienceBlockDispatch, {
        props: { contentElement: block({ componentType }) },
      })

      expect(wrapper.text()).toBe('')
    },
  )

  it('reports an unimplemented block type by name in dev and test builds', () => {
    const wrapper = mount(AmplienceBlockDispatch, {
      props: {
        contentElement: block({
          componentType: 'somethingNew',
          somethingNew: {},
        }),
      },
    })

    expect(wrapper.text()).toContain('somethingNew')
    expect(wrapper.text()).toContain('is not implemented')
  })

  it('forwards fallthrough attrs to the not-implemented message', () => {
    const wrapper = mount(AmplienceBlockDispatch, {
      props: {
        contentElement: block({
          componentType: 'somethingNew',
          somethingNew: {},
        }),
      },
      attrs: { class: 'mt-auto' },
    })

    expect(wrapper.classes()).toContain('mt-auto')
  })

  it.for(['constructor', 'toString', 'valueOf', '__proto__'])(
    'reports %s as unimplemented instead of resolving it on the prototype chain',
    (componentType) => {
      const wrapper = mount(AmplienceBlockDispatch, {
        props: { contentElement: block({ componentType }) },
      })

      expect(wrapper.text()).toContain('is not implemented')
    },
  )

  it.for([
    ['richText', 'RichTextComponent'],
    ['productSlider', 'ProductSliderComponent'],
    ['smartSorting', 'SmartSortingProductsSliderComponent'],
    ['recentlyViewed', 'RecentlyViewedProductsComponent'],
    ['singleProduct', 'SingleProductComponent'],
  ] as const)(
    'keeps a %s block behind Suspense until it resolves',
    async ([componentType, componentName]) => {
      const stub = createDeferredStub(componentType)
      const wrapper = mount(AmplienceBlockDispatch, {
        props: {
          contentElement: block({ componentType, [componentType]: {} }),
        },
        global: { stubs: { [componentName]: stub.component } },
      })

      expect(wrapper.find('[data-testid="routed"]').exists()).toBe(false)

      stub.resolve()
      await flushPromises()

      expect(wrapper.find('[data-testid="routed"]').text()).toBe(componentType)
    },
  )

  it('drops the previous async block while the next async block type is pending', async () => {
    const richText = createDeferredStub('Rich text')
    const productSlider = createDeferredStub('Product slider')
    const wrapper = mount(AmplienceBlockDispatch, {
      props: {
        contentElement: block({ componentType: 'richText', richText: {} }),
      },
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

    await wrapper.setProps({
      contentElement: block({
        componentType: 'productSlider',
        productSlider: {},
      }),
    })

    expect(wrapper.text()).toBe('')

    productSlider.resolve()
    await flushPromises()

    expect(wrapper.text()).toBe('Product slider')
  })

  it('forwards fallthrough attrs to an async block', async () => {
    const richText = createDeferredStub('Rich text')
    richText.resolve()
    const wrapper = mount(AmplienceBlockDispatch, {
      props: {
        contentElement: block({ componentType: 'richText', richText: {} }),
      },
      attrs: { class: 'mt-auto' },
      global: { stubs: { RichTextComponent: richText.component } },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="routed"]').classes()).toContain(
      'mt-auto',
    )
  })
})
