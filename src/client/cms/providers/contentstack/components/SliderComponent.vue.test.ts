import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import type { SliderComponent as SliderComponentType } from '@shared/types/cms/contentstack'
import { vLivePreview } from '../directives/livePreview'
import SliderComponent from './SliderComponent.vue'

// Slides, arrows and dots are tested once in `shared/SFCmsSlider.vue.test.ts`.
// The stub renders one default slot per item, so these tests cover only what
// this provider maps onto the shared slider.
const cmsSliderStub = {
  name: 'SFCmsSlider',
  props: ['items', 'getItemKey', 'withArrows', 'withPaginationIndicators'],
  template: `<div>
    <template v-for="(item, index) in items" :key="getItemKey(item, index)">
      <slot :item="item" />
    </template>
  </div>`,
}

const dispatchStub = {
  name: 'ContentstackBlockDispatch',
  props: ['contentElement'],
  template: '<div />',
}

const makeContent = (overrides: Record<string, unknown> = {}) =>
  ({
    content: [{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }],
    ...overrides,
  }) as unknown as SliderComponentType

const mountSlider = (contentElement: SliderComponentType = makeContent()) =>
  mount(SliderComponent, {
    props: { contentElement },
    global: {
      directives: { 'live-preview': vLivePreview },
      stubs: {
        SFCmsSlider: cmsSliderStub,
        ContentstackBlockDispatch: dispatchStub,
      },
    },
  })

describe('Contentstack SliderComponent', () => {
  it('renders each content entry through the block dispatch in authored order', () => {
    const blocks = mountSlider().findAllComponents(dispatchStub)

    expect(blocks.map((block) => block.props('contentElement').uid)).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('keys each slide by its entry uid', () => {
    const getItemKey = mountSlider()
      .findComponent(cmsSliderStub)
      .props('getItemKey')

    expect(getItemKey({ uid: 'b' }, 1)).toBe('b')
  })

  // Both flags default to shown when the author leaves them unset, matching
  // the Storefront Application V2.
  it.for([
    {
      case: 'unset flags',
      fields: {},
      withArrows: true,
      withPaginationIndicators: true,
    },
    {
      case: 'arrows turned off',
      fields: { show_navigation_arrows: false },
      withArrows: false,
      withPaginationIndicators: true,
    },
    {
      case: 'dots turned off',
      fields: { show_pagination_indicators: false },
      withArrows: true,
      withPaginationIndicators: false,
    },
  ])(
    'maps $case to the slider flags',
    ({ fields, withArrows, withPaginationIndicators }) => {
      const props = mountSlider(makeContent(fields))
        .findComponent(cmsSliderStub)
        .props()

      expect(props).toMatchObject({ withArrows, withPaginationIndicators })
    },
  )
})
