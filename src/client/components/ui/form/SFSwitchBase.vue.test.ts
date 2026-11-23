import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SFSwitchBase from './SFSwitchBase.vue'

const mountBase = (
  props: Partial<InstanceType<typeof SFSwitchBase>['$props']> = {},
) =>
  mount(SFSwitchBase, {
    props: { id: 'switch-base', ...props },
  })

describe('SFSwitchBase', () => {
  it('renders a button with role="switch"', () => {
    const wrapper = mountBase()
    const btn = wrapper.find('button')

    expect(btn.exists()).toBe(true)
    expect(btn.attributes('role')).toBe('switch')
    expect(btn.attributes('type')).toBe('button')
  })

  it('reflects model value via aria-checked', async () => {
    const wrapper = mountBase({ modelValue: false })

    expect(wrapper.find('button').attributes('aria-checked')).toBe('false')

    await wrapper.setProps({ modelValue: true })

    expect(wrapper.find('button').attributes('aria-checked')).toBe('true')
  })

  it('toggles model on click', async () => {
    const wrapper = mountBase({ modelValue: false })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })

  it('does not toggle when disabled', async () => {
    const wrapper = mountBase({ modelValue: false, disabled: true })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('marks the switch aria-disabled when disabled', () => {
    const wrapper = mountBase({ modelValue: false, disabled: true })

    expect(wrapper.find('button').attributes('aria-disabled')).toBe('true')
  })
})
