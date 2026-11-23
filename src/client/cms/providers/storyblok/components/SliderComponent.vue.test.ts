import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import type { SliderComponent as SliderComponentType } from '@shared/types/cms/storyblok'
import { vEditable } from '../directives/editable'
import SliderComponent from './SliderComponent.vue'

// Slides, arrows and pagination dots are tested once in
// shared/SFCmsSlider.vue.test.ts. These tests cover how the Storyblok fields
// map onto it.
const cmsSliderStub = {
  name: 'SFCmsSlider',
  props: ['items', 'getItemKey', 'withArrows', 'withPaginationIndicators'],
  template: `<div>
    <template v-for="item in items" :key="item._uid"><slot :item="item" /></template>
  </div>`,
}

const dispatchStub = {
  name: 'StoryblokBlockDispatch',
  props: ['contentElement'],
  template: '<div />',
}

const makeContent = (overrides: Record<string, unknown> = {}) =>
  ({
    content: [{ _uid: 'a' }, { _uid: 'b' }, { _uid: 'c' }],
    ...overrides,
  }) as unknown as SliderComponentType

const mountSlider = (contentElement: SliderComponentType = makeContent()) =>
  mount(SliderComponent, {
    props: { contentElement },
    global: {
      directives: { editable: vEditable },
      stubs: {
        SFCmsSlider: cmsSliderStub,
        StoryblokBlockDispatch: dispatchStub,
      },
    },
  })

describe('Storyblok SliderComponent', () => {
  it('renders each slider item through the block dispatcher', () => {
    const dispatched = mountSlider()
      .findAllComponents(dispatchStub)
      .map((block) => block.props('contentElement')._uid)

    expect(dispatched).toEqual(['a', 'b', 'c'])
  })

  it('keys each slide by its blok _uid', () => {
    const getItemKey = mountSlider()
      .findComponent(cmsSliderStub)
      .props('getItemKey') as (item: { _uid: string }, index: number) => string

    expect(getItemKey({ _uid: 'b' }, 1)).toBe('b')
  })

  it.for([
    {
      case: 'shows arrows and dots when the flags are unset',
      fields: {},
      withArrows: true,
      withPaginationIndicators: true,
    },
    {
      case: 'passes showNavigationArrows to the arrows',
      fields: { showNavigationArrows: false },
      withArrows: false,
      withPaginationIndicators: true,
    },
    {
      case: 'passes showPaginationIndicators to the dots',
      fields: { showPaginationIndicators: false },
      withArrows: true,
      withPaginationIndicators: false,
    },
  ])('$case', ({ fields, withArrows, withPaginationIndicators }) => {
    const props = mountSlider(makeContent(fields))
      .findComponent(cmsSliderStub)
      .props()

    expect(props).toMatchObject({ withArrows, withPaginationIndicators })
  })
})
