import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SFChipGroup from './SFChipGroup.vue'

describe('SFChipGroup', () => {
  it.for([
    { selectionMode: 'single', ariaLabel: 'Size', role: 'radiogroup' },
    { selectionMode: 'multi', ariaLabel: 'Sizes', role: 'group' },
    { selectionMode: 'multi', ariaLabel: undefined, role: undefined },
    { selectionMode: 'none', ariaLabel: undefined, role: undefined },
  ] as const)(
    'renders role $role in $selectionMode mode with aria-label $ariaLabel',
    ({ selectionMode, ariaLabel, role }) => {
      const wrapper = mount(SFChipGroup, {
        props: { selectionMode, ariaLabel },
      })

      expect(wrapper.attributes('role')).toBe(role)
    },
  )
})
