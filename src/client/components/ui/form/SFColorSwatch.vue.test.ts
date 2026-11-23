import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SFColorSwatch from './SFColorSwatch.vue'

const props = { id: 'swatch-red', color: '#ff0000' }

describe('SFColorSwatch', () => {
  it('ties the visible label to the swatch input', () => {
    const wrapper = mount(SFColorSwatch, { props: { ...props, label: 'Red' } })
    const label = wrapper.get('label')

    expect(label.attributes('for')).toBe(
      wrapper.get('[data-testid="color-swatch"]').attributes('id'),
    )
    expect(label.text()).toBe('Red')
  })

  it('ties the default slot to the swatch input in place of the label', () => {
    const wrapper = mount(SFColorSwatch, {
      props,
      slots: { default: 'Red, sold out' },
    })
    const label = wrapper.get('label')

    expect(label.attributes('for')).toBe(
      wrapper.get('[data-testid="color-swatch"]').attributes('id'),
    )
    expect(label.text()).toBe('Red, sold out')
  })
})
