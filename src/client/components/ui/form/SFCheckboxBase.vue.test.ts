import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SFCheckboxBase from './SFCheckboxBase.vue'

const mountComponent = (props = {}) =>
  mount(SFCheckboxBase, {
    props: { id: 'checkbox-1', ...props },
  })

describe('SFCheckboxBase', () => {
  it('toggles the boolean model via v-model', async () => {
    const wrapper = mountComponent({ modelValue: false })
    await wrapper.get('input').setValue(true)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })

  it('emits change when the user toggles the input', async () => {
    const wrapper = mountComponent({ modelValue: false })
    await wrapper.get('input').setValue(true)
    expect(wrapper.emitted('change')).toHaveLength(1)
  })

  describe('disabled state', () => {
    it('exposes aria-disabled without the native disabled attribute', () => {
      // Native `disabled` would drop the control from the tab order; we
      // express the state via `aria-disabled` only so the input stays
      // focusable (consistent with the boilerplate's disabled-button pattern).
      const wrapper = mountComponent({ disabled: true })
      const input = wrapper.get('input')
      expect(input.attributes('aria-disabled')).toBe('true')
      expect(input.attributes('disabled')).toBeUndefined()
    })

    it('does not emit change or update:modelValue on a disabled toggle', async () => {
      // Locks in the `onChange`/`onClick` guards: a future refactor (e.g.
      // moving the logic to `@input` or removing `onClick`'s preventDefault)
      // can't silently re-enable mutation while `disabled` is true.
      const wrapper = mountComponent({ disabled: true, modelValue: false })
      await wrapper.get('input').trigger('click')
      await wrapper.get('input').trigger('change')
      expect(wrapper.emitted('change')).toBeUndefined()
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
  })

  describe('invalid state', () => {
    it('exposes aria-invalid when invalid', () => {
      const wrapper = mountComponent({ invalid: true })
      expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
    })

    it('omits aria-invalid by default', () => {
      const wrapper = mountComponent()
      expect(wrapper.get('input').attributes('aria-invalid')).toBeUndefined()
    })
  })
})
