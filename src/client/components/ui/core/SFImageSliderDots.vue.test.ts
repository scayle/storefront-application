import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SFImageSliderDots from './SFImageSliderDots.vue'

const mountComponent = (props: { count: number; active: number }) =>
  mount(SFImageSliderDots, {
    props,
    global: { mocks: { $t: (key: string) => key } },
  })

describe('SFImageSliderDots', () => {
  it('renders one dot per slide', () => {
    const wrapper = mountComponent({ count: 4, active: 0 })
    expect(wrapper.findAll('[data-testid^="image-slider-dot-"]')).toHaveLength(
      4,
    )
  })

  it('marks the active dot with aria-current', () => {
    const wrapper = mountComponent({ count: 3, active: 1 })
    const active = wrapper.get('[data-testid="image-slider-dot-1"]')
    expect(active.attributes('aria-current')).toBe('true')
    expect(
      wrapper
        .get('[data-testid="image-slider-dot-0"]')
        .attributes('aria-current'),
    ).toBeUndefined()
  })

  it('emits select with the dot index on click', async () => {
    const wrapper = mountComponent({ count: 3, active: 0 })
    await wrapper.get('[data-testid="image-slider-dot-2"]').trigger('click')
    expect(wrapper.emitted('select')).toStrictEqual([[2]])
  })
})
