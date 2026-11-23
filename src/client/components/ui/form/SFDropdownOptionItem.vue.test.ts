import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { DropdownOptionType } from '@client/utils/constants'
import SFDropdownOptionItem from './SFDropdownOptionItem.vue'
import SFRadioBase from './SFRadioBase.vue'

const mountComponent = (props = {}, slots = { default: 'Option' }) =>
  mount(SFDropdownOptionItem, { props, slots })

describe('SFDropdownOptionItem', () => {
  it.for([
    { selected: true, ariaSelected: 'true' },
    { selected: false, ariaSelected: 'false' },
  ])(
    'sets aria-selected to $ariaSelected when selected is $selected',
    ({ selected, ariaSelected }) => {
      const wrapper = mountComponent({ selected })
      expect(wrapper.get('[role="option"]').attributes('aria-selected')).toBe(
        ariaSelected,
      )
    },
  )

  it('marks a disabled option with aria-disabled', () => {
    expect(
      mountComponent({ disabled: true })
        .get('[role="option"]')
        .attributes('aria-disabled'),
    ).toBe('true')
    expect(
      mountComponent().get('[role="option"]').attributes('aria-disabled'),
    ).toBeUndefined()
  })

  it('emits select on click', async () => {
    const wrapper = mountComponent()
    await wrapper.get('[role="option"]').trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('does not emit select when disabled', async () => {
    const wrapper = mountComponent({ disabled: true })
    await wrapper.get('[role="option"]').trigger('click')
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  describe('leading-radio type', () => {
    it('renders the radio as decoration hidden from assistive technology', () => {
      const wrapper = mountComponent({
        type: DropdownOptionType.LEADING_RADIO,
        selected: false,
      })

      expect(wrapper.find('input').exists()).toBe(false)
      expect(wrapper.findAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
    })

    it('shows the radio dot only on a selected, enabled option', () => {
      const indicatorCount = (props: Record<string, unknown>) =>
        mountComponent({
          type: DropdownOptionType.LEADING_RADIO,
          ...props,
        }).findAll('[aria-hidden="true"]').length

      const unselected = indicatorCount({ selected: false })
      expect(indicatorCount({ selected: true })).toBeGreaterThan(unselected)
      expect(indicatorCount({ selected: true, disabled: true })).toBe(
        unselected,
      )
    })

    it('renders no radio for the default type', () => {
      const wrapper = mountComponent({ type: DropdownOptionType.DEFAULT })
      expect(wrapper.findComponent(SFRadioBase).exists()).toBe(false)
    })
  })
})
