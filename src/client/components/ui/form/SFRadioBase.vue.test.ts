import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SFRadioBase from './SFRadioBase.vue'

const mountComponent = (props = {}) =>
  mount(SFRadioBase, {
    props: { id: 'radio-1', ...props },
  })

describe('SFRadioBase', () => {
  it('selects the value via v-model', async () => {
    const wrapper = mountComponent({
      value: 'a',
      name: 'group',
      modelValue: undefined,
    })
    await wrapper.get('input').setValue(true)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['a'])
  })

  it('disables the input and sets aria-disabled', () => {
    const wrapper = mountComponent({ disabled: true })
    const input = wrapper.get('input')
    expect(input.attributes('disabled')).toBeDefined()
    expect(input.attributes('aria-disabled')).toBe('true')
  })

  it('sets aria-invalid when invalid', () => {
    const wrapper = mountComponent({ invalid: true })
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
  })

  describe('decorative mode', () => {
    it('renders no native input', () => {
      const wrapper = mountComponent({ decorative: true })
      expect(wrapper.find('input').exists()).toBe(false)
    })

    // Decorative mode has no input or ARIA state to read: the enclosing option
    // owns `aria-selected`, and the ring and the checked dot are both
    // aria-hidden. The dot is the second hidden layer next to the ring.
    it.for([
      { checked: false, disabled: false, showsDot: false },
      { checked: true, disabled: false, showsDot: true },
      { checked: true, disabled: true, showsDot: false },
    ])(
      'shows the checked dot: $showsDot when checked is $checked and disabled is $disabled',
      ({ checked, disabled, showsDot }) => {
        const wrapper = mountComponent({ decorative: true, checked, disabled })
        expect(wrapper.findAll('[aria-hidden="true"]')).toHaveLength(
          showsDot ? 2 : 1,
        )
      },
    )
  })
})
