import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { SliderComponent as SliderComponentType } from '@shared/types/cms/amplience'
import SliderComponent from './SliderComponent.vue'

// Arrows, pagination dots and their accessibility attributes are tested once in
// shared/SFCmsSlider.vue.test.ts. These tests only cover what the Amplience
// fields hand to it.
const cmsSliderStub = {
  name: 'SFCmsSlider',
  props: ['items', 'getItemKey', 'withArrows', 'withPaginationIndicators'],
  template: '<div><slot v-for="item in items" :item="item" /></div>',
}

const dispatchStub = {
  name: 'AmplienceBlockDispatch',
  props: ['contentElement'],
  template:
    '<div data-testid="block">{{ contentElement._meta.deliveryId }}</div>',
}

const makeContent = (overrides: Record<string, unknown> = {}) =>
  ({
    _meta: { schema: 'x', deliveryId: 'slider-1' },
    content: [
      { componentType: 'text', _meta: { deliveryId: 'a' } },
      { componentType: 'text', _meta: { deliveryId: 'b' } },
      { componentType: 'text', _meta: { deliveryId: 'c' } },
    ],
    ...overrides,
  }) as unknown as SliderComponentType

const mountSlider = (contentElement: SliderComponentType = makeContent()) =>
  mount(SliderComponent, {
    props: { contentElement },
    global: {
      stubs: {
        SFCmsSlider: cmsSliderStub,
        AmplienceBlockDispatch: dispatchStub,
      },
    },
  })

describe('Amplience SliderComponent', () => {
  it('renders each authored block as a slide through the dispatcher', () => {
    const blocks = mountSlider().findAll('[data-testid="block"]')

    expect(blocks.map((block) => block.text())).toEqual(['a', 'b', 'c'])
  })

  // Both flags fall back to true, matching the Storefront Application V2
  // slider, so an author who never touched them still gets arrows and dots.
  it.for([
    { fields: {}, withArrows: true, withPaginationIndicators: true },
    {
      fields: { show_navigation_arrows: false },
      withArrows: false,
      withPaginationIndicators: true,
    },
    {
      fields: { show_pagination_indicators: false },
      withArrows: true,
      withPaginationIndicators: false,
    },
  ])(
    'passes withArrows $withArrows and withPaginationIndicators $withPaginationIndicators for $fields',
    ({ fields, withArrows, withPaginationIndicators }) => {
      const slider = mountSlider(makeContent(fields)).findComponent(
        cmsSliderStub,
      )

      expect(slider.props()).toMatchObject({
        withArrows,
        withPaginationIndicators,
      })
    },
  )
})
