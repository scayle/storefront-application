import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SFSwitch from './SFSwitch.vue'

const mountSwitch = (
  props: Partial<InstanceType<typeof SFSwitch>['$props']> = {},
) =>
  mount(SFSwitch, {
    props: { id: 'sf-switch', ...props },
  })

describe('SFSwitch', () => {
  it('renders label when provided', () => {
    const wrapper = mountSwitch({ label: 'Marketing emails' })

    expect(wrapper.text()).toContain('Marketing emails')
  })

  it('describes the switch with its helper text', () => {
    const wrapper = mountSwitch({
      label: 'Label',
      helperText: 'Helper info',
    })
    const describedBy = wrapper.get('button').attributes('aria-describedby')

    expect(wrapper.get(`#${describedBy}`).text()).toBe('Helper info')
  })

  it('shows the helper text in the disabled state when the switch is disabled', () => {
    const wrapper = mountSwitch({
      label: 'Label',
      helperText: 'Helper info',
      disabled: true,
    })
    const describedBy = wrapper.get('button').attributes('aria-describedby')

    expect(wrapper.get(`#${describedBy}`).classes()).toContain('text-disabled')
  })

  it('emits update:modelValue when base toggles', async () => {
    const wrapper = mountSwitch({ label: 'Click me', modelValue: false })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })

  it('does not emit when disabled', async () => {
    const wrapper = mountSwitch({
      label: 'Locked',
      modelValue: false,
      disabled: true,
    })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('associates label with control via aria-labelledby', () => {
    const wrapper = mountSwitch({ label: 'Linked' })

    // The visible label is a `<span>` with an id; the button references it
    // via `aria-labelledby` (no `<label for>` on a role="switch" button —
    // AT behavior for that pairing is inconsistent).
    const button = wrapper.get('button')

    expect(button.attributes('id')).toBe('sf-switch')
    expect(wrapper.get(`#${button.attributes('aria-labelledby')}`).text()).toBe(
      'Linked',
    )
    expect(button.attributes('aria-label')).toBeUndefined()
  })

  it('names the switch with aria-label when no visible label is given', () => {
    const wrapper = mountSwitch({ ariaLabel: 'Marketing emails' })
    const button = wrapper.get('button')

    expect(button.attributes('aria-label')).toBe('Marketing emails')
    expect(button.attributes('aria-labelledby')).toBeUndefined()
  })

  it('toggles when the label is clicked', async () => {
    const wrapper = mountSwitch({ label: 'Click via label', modelValue: false })

    const labelId = wrapper.get('button').attributes('aria-labelledby')
    await wrapper.get(`#${labelId}`).trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })
})
