import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SFSwitchGroup from './SFSwitchGroup.vue'
import SFSwitch from './SFSwitch.vue'

const mountGroup = (
  props: Partial<InstanceType<typeof SFSwitchGroup>['$props']> = {},
) =>
  mount(SFSwitchGroup, {
    props,
    slots: {
      default: `
        <SFSwitch id="g-1" label="One" />
        <SFSwitch id="g-2" label="Two" />
      `,
    },
    global: { components: { SFSwitch } },
  })

describe('SFSwitchGroup', () => {
  it('names the fieldset with its legend', () => {
    const wrapper = mountGroup({ legend: 'Notifications' })

    expect(wrapper.get('fieldset > legend').text()).toBe('Notifications')
  })

  it.for([{ disabled: false }, { disabled: true }])(
    'shows the shared helper text in the disabled state when the group is disabled: $disabled',
    ({ disabled }) => {
      const wrapper = mountGroup({ helperText: 'Group helper', disabled })
      const helperText = wrapper
        .findAll('span')
        .find((span) => span.text() === 'Group helper')

      expect(helperText?.classes('text-disabled')).toBe(disabled)
    },
  )

  it('disables every child switch when group is disabled', () => {
    const wrapper = mountGroup({ disabled: true })
    const buttons = wrapper.findAll('button')

    expect(buttons).toHaveLength(2)
    buttons.forEach((btn) => {
      // `aria-disabled` only — native `disabled` would drop the button from
      // the tab order when state flips while focused (WCAG 2.4.3).
      expect(btn.attributes('aria-disabled')).toBe('true')
      expect(btn.attributes('disabled')).toBeUndefined()
    })
  })

  it('marks fieldset aria-disabled when disabled', () => {
    const wrapper = mountGroup({ disabled: true })

    expect(wrapper.find('fieldset').attributes('aria-disabled')).toBe('true')
  })

  it('leaves children interactive when group is enabled', () => {
    const wrapper = mountGroup()
    const buttons = wrapper.findAll('button')

    buttons.forEach((btn) => {
      expect(btn.attributes('aria-disabled')).toBeUndefined()
    })
  })
})
