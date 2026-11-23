import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import type { TypeSliderComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import SliderComponent from './SliderComponent.vue'

// Arrows, pagination dots and their accessible labels are tested once in
// shared/SFCmsSlider.vue.test.ts. These tests cover how the Contentful fields
// map onto the shared slider.
const cmsSliderStub = {
  name: 'SFCmsSlider',
  props: ['items', 'getItemKey', 'withArrows', 'withPaginationIndicators'],
  template: `<div>
    <div v-for="(item, index) in items" :key="getItemKey(item, index)">
      <slot :item="item" />
    </div>
  </div>`,
}

const dispatchStub = {
  name: 'ContentfulBlockDispatch',
  props: ['contentElement'],
  template: '<div />',
}

const content = [{ sys: { id: 'a' } }, { sys: { id: 'b' } }]

const makeContent = (fields: Record<string, unknown> = {}) =>
  ({
    sys: { id: 'slider-1' },
    fields: { content, ...fields },
  }) as unknown as TypeSliderComponentWithoutUnresolvableLinksResponse

const mountSlider = (
  contentElement: TypeSliderComponentWithoutUnresolvableLinksResponse = makeContent(),
) =>
  mount(SliderComponent, {
    props: { contentElement },
    global: {
      stubs: {
        SFCmsSlider: cmsSliderStub,
        ContentfulBlockDispatch: dispatchStub,
      },
    },
  })

describe('Contentful SliderComponent', () => {
  it('renders each content entry through the block dispatcher, in authored order', () => {
    const blocks = mountSlider().findAllComponents(dispatchStub)

    expect(blocks.map((block) => block.props('contentElement'))).toEqual(
      content,
    )
  })

  it.for([
    { fields: {}, withArrows: true, withPaginationIndicators: true },
    {
      fields: { showNavigationArrows: false },
      withArrows: false,
      withPaginationIndicators: true,
    },
    {
      fields: { showPaginationIndicators: false },
      withArrows: true,
      withPaginationIndicators: false,
    },
  ])(
    'passes arrows $withArrows and dots $withPaginationIndicators for fields $fields',
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
