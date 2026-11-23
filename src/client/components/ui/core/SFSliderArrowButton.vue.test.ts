import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SFSliderArrowButton from './SFSliderArrowButton.vue'

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(SFSliderArrowButton, {
    props: { direction: 'previous', accessibleLabel: 'Previous', ...props },
    global: { mocks: { $t: (key: string) => key } },
  })

describe('SFSliderArrowButton', () => {
  it('reflects the disabled state via aria-disabled', () => {
    expect(mountComponent({ disabled: true }).attributes('aria-disabled')).toBe(
      'true',
    )
  })

  it('emits click', async () => {
    const wrapper = mountComponent()
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
