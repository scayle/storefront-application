import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SFValidatedInputGroup from './SFValidatedInputGroup.vue'

describe('SFValidatedInputGroup', () => {
  const SFFadeInTransition = {
    template: '<div><slot /></div>',
  }

  it('exposes errorId via slot for aria-describedby association', () => {
    const wrapper = mount(SFValidatedInputGroup, {
      global: { stubs: { SFFadeInTransition } },
      slots: {
        default: `
          <template #default="{ errorId }">
            <input :aria-describedby="errorId" data-testid="input" />
          </template>
        `,
      },
    })

    const errorP = wrapper.find('[data-testid="validation-error-text"]')
    const input = wrapper.find('[data-testid="input"]')

    expect(errorP.attributes('id')).toBeTruthy()
    expect(input.attributes('aria-describedby')).toBe(errorP.attributes('id'))
  })

  it('renders error message inside always-present status region', () => {
    const wrapper = mount(SFValidatedInputGroup, {
      props: { errors: ['Name is required'] },
      global: { stubs: { SFFadeInTransition } },
    })

    const errorRegion = wrapper.find('[data-testid="validation-error-text"]')
    expect(errorRegion.exists()).toBe(true)
    // `role="status"` implies `aria-live="polite"` + `aria-atomic="true"`.
    expect(errorRegion.attributes('role')).toBe('status')
    expect(errorRegion.text()).toBe('Name is required')
  })

  it('shows only the first error when several rules fail', () => {
    const wrapper = mount(SFValidatedInputGroup, {
      props: { errors: ['Name is required', 'Name is too short'] },
      global: { stubs: { SFFadeInTransition } },
    })

    expect(wrapper.get('[data-testid="validation-error-text"]').text()).toBe(
      'Name is required',
    )
  })

  it('keeps status region in DOM when there are no errors', () => {
    const wrapper = mount(SFValidatedInputGroup, {
      props: { errors: [] },
      global: { stubs: { SFFadeInTransition } },
    })

    const errorRegion = wrapper.find('[data-testid="validation-error-text"]')
    expect(errorRegion.exists()).toBe(true)
    expect(errorRegion.attributes('role')).toBe('status')
    expect(errorRegion.text()).toBe('')
  })

  it('exposes isValid as true when no errors', () => {
    const wrapper = mount(SFValidatedInputGroup, {
      props: { errors: [] },
      global: { stubs: { SFFadeInTransition } },
      slots: {
        default: `
          <template #default="{ isValid }">
            <span data-testid="valid">{{ isValid }}</span>
          </template>
        `,
      },
    })

    expect(wrapper.find('[data-testid="valid"]').text()).toBe('true')
  })

  it('exposes isValid as false when errors exist', () => {
    const wrapper = mount(SFValidatedInputGroup, {
      props: { errors: ['Error'] },
      global: { stubs: { SFFadeInTransition } },
      slots: {
        default: `
          <template #default="{ isValid }">
            <span data-testid="valid">{{ isValid }}</span>
          </template>
        `,
      },
    })

    expect(wrapper.find('[data-testid="valid"]').text()).toBe('false')
  })
})
