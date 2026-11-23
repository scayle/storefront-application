import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { t } from '@test/mocks/vue-i18n'
import SFGenderSelection from './SFGenderSelection.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const SFDropdownStub = {
  template: `<div v-bind="$attrs" :aria-describedby="ariaDescribedby">
    <span data-testid="dropdown-value"><slot /></span>
    <label data-testid="dropdown-label">{{ label }}</label>
    <div v-for="item in items" :key="item">
      <slot
        name="item"
        :item="item"
        :selectItem="() => {}"
        :isSelected="item === modelValue"
      />
    </div>
  </div>`,
  props: ['items', 'modelValue', 'label', 'ariaDescribedby'],
  inheritAttrs: false,
}

const SFDropdownOptionItemStub = {
  template: '<div v-bind="$attrs" @click="$emit(\'select\')"><slot /></div>',
  emits: ['select'],
  inheritAttrs: false,
}

const mountComponent = (props = {}) =>
  mount(SFGenderSelection, {
    props: { disabled: false, isValid: true, ...props },
    global: {
      stubs: {
        SFDropdown: SFDropdownStub,
        SFDropdownOptionItem: SFDropdownOptionItemStub,
      },
      mocks: { $t: t },
    },
  })

describe('SFGenderSelection', () => {
  it.for([
    ['m', 'male'],
    ['f', 'female'],
    ['d', 'diverse'],
    ['n', 'none'],
  ] as const)('offers the %s option with the %s label', ([value, label]) => {
    const wrapper = mountComponent()

    expect(wrapper.get(`[data-testid="gender-option-${value}"]`).text()).toBe(
      `account.form_fields.gender_options.${label}`,
    )
  })

  it.for([
    [undefined, ''],
    ['f', 'account.form_fields.gender_options.female'],
  ] as const)(
    'shows the label of the selected value %s in the dropdown',
    ([modelValue, label]) => {
      const wrapper = mountComponent({ modelValue })

      expect(wrapper.get('[data-testid="dropdown-value"]').text()).toBe(label)
    },
  )

  it('passes aria-describedby to the dropdown', () => {
    const wrapper = mountComponent({ ariaDescribedby: 'error-id-123' })

    expect(
      wrapper
        .find('[data-testid="gender-selection"]')
        .attributes('aria-describedby'),
    ).toBe('error-id-123')
  })

  it('labels the dropdown as a required gender field', () => {
    const wrapper = mountComponent()

    expect(wrapper.get('[data-testid="dropdown-label"]').text()).toBe(
      'account.form_fields.gender *',
    )
  })
})
