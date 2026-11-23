import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SFCmsSlider from './SFCmsSlider.vue'

// Slider state exposed through the SFItemSlider stub's `#arrows` / `#thumbnails`
// slots. Set per mount so tests can drive the active slide.
let activeSlide = 0

const itemSliderStub = {
  name: 'SFItemSlider',
  props: ['withArrows'],
  setup: () => ({ activeSlide }),
  template: `<div>
    <slot />
    <slot name="arrows" v-bind="{ isPrevEnabled: true, isNextEnabled: true, isScrollable: true, prev: () => {}, next: () => {} }" />
    <slot name="thumbnails" v-bind="{ activeSlide, scrollImageIntoView: () => {} }" />
  </div>`,
}

const arrowButtonStub = {
  name: 'SFSliderArrowButton',
  props: ['direction'],
  template: `<button :data-testid="'arrow-' + direction"></button>`,
}

const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

const mountSlider = (
  props: { withArrows?: boolean; withPaginationIndicators?: boolean } = {},
  slide = 0,
) => {
  activeSlide = slide
  return mount(SFCmsSlider<{ id: string }>, {
    props: { items, getItemKey: (item) => item.id, ...props },
    slots: {
      default: '<template #default="{ item }">{{ item.id }}</template>',
    },
    global: {
      stubs: {
        SFItemSlider: itemSliderStub,
        SFSliderArrowButton: arrowButtonStub,
      },
      mocks: {
        $t: (key: string, params?: Record<string, unknown>) =>
          params ? `${key}:${JSON.stringify(params)}` : key,
      },
    },
  })
}

const dots = (wrapper: ReturnType<typeof mountSlider>) =>
  wrapper.findAll('button[aria-label^="slider.a11y.go_to_slide"]')

describe('SFCmsSlider', () => {
  it('renders one slide per item through the default slot', () => {
    expect(mountSlider().text()).toContain('abc')
  })

  it('renders arrows and one dot per slide by default', () => {
    const wrapper = mountSlider()

    expect(wrapper.find('[data-testid="arrow-previous"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="arrow-next"]').exists()).toBe(true)
    expect(dots(wrapper)).toHaveLength(3)
  })

  it('omits the arrows when withArrows is false', () => {
    const wrapper = mountSlider({ withArrows: false })

    expect(wrapper.find('[data-testid="arrow-previous"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="arrow-next"]').exists()).toBe(false)
  })

  it('omits the dots when withPaginationIndicators is false', () => {
    expect(dots(mountSlider({ withPaginationIndicators: false }))).toHaveLength(
      0,
    )
  })

  it.for([0, 1, 2])('marks only dot %i as current', (slide) => {
    const current = dots(mountSlider({}, slide)).map((dot) =>
      dot.attributes('aria-current'),
    )

    expect(current).toEqual(
      items.map((_, index) => (index === slide ? 'true' : undefined)),
    )
  })

  it('labels each dot with its 1-based position and the slide count', () => {
    const labels = dots(mountSlider()).map((dot) =>
      dot.attributes('aria-label'),
    )

    expect(labels[0]).toBe('slider.a11y.go_to_slide:{"index":1,"total":3}')
    expect(labels[2]).toBe('slider.a11y.go_to_slide:{"index":3,"total":3}')
  })
})
