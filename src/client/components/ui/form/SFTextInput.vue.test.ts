import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { DOMWrapper } from '@vue/test-utils'
import SFTextInput from './SFTextInput.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const tMock = (key: string, params?: Record<string, unknown>) => {
  if (!params) {
    return key
  }
  return Object.entries(params).reduce(
    (acc, [name, value]) => acc.replace(`{${name}}`, String(value)),
    key,
  )
}

const mountComponent = (
  props: Record<string, unknown> = {},
  options: { attach?: boolean; attrs?: Record<string, string> } = {},
) =>
  mount(SFTextInput, {
    props: { placeholder: 'Label', ...props },
    attrs: options.attrs,
    attachTo: options.attach ? document.body : undefined,
    global: {
      mocks: { $t: tMock },
    },
  })

const getInput = (wrapper: ReturnType<typeof mountComponent>) =>
  wrapper.find('input') as DOMWrapper<HTMLInputElement>

describe('SFTextInput - default variant', () => {
  it('renders a text input by default', () => {
    const wrapper = mountComponent()

    const input = getInput(wrapper)
    expect(input.exists()).toBe(true)
    expect(input.attributes('type')).toBe('text')
  })

  it('renders the floating label', () => {
    const wrapper = mountComponent({ placeholder: 'Email' })

    expect(wrapper.find('label').text()).toBe('Email')
  })

  it('associates the label with the input', () => {
    const wrapper = mountComponent({ placeholder: 'Email' })

    const inputId = getInput(wrapper).attributes('id')
    expect(wrapper.find('label').attributes('for')).toBe(inputId)
  })

  it('sets aria-invalid when hasErrors is true', () => {
    const wrapper = mountComponent({ hasErrors: true })

    expect(getInput(wrapper).attributes('aria-invalid')).toBe('true')
  })

  it('sets aria-required when required is true', () => {
    const wrapper = mountComponent({ required: true })

    expect(getInput(wrapper).attributes('aria-required')).toBe('true')
  })

  it('disables the input and sets aria-disabled', () => {
    const wrapper = mountComponent({ disabled: true })

    const input = getInput(wrapper)
    expect(input.attributes('disabled')).toBeDefined()
    expect(input.attributes('aria-disabled')).toBe('true')
  })

  it('draws the focus ring around the field when readonly', () => {
    // The input cancels its own outline, so a readonly field without the
    // wrapper ring shows no focus indication at all.
    const wrapper = mountComponent({ readonly: true })

    expect(getInput(wrapper).element.parentElement?.className).toContain(
      'focus-within:focus-style',
    )
  })

  it('leaves the field without a focus ring when disabled', () => {
    // Trailing content such as the password toggle stays focusable and draws
    // its own ring, which the disabled field must not repeat.
    const wrapper = mountComponent({ disabled: true })

    expect(getInput(wrapper).element.parentElement?.className).not.toContain(
      'focus-within:focus-style',
    )
  })

  it('renders helper text below the input', () => {
    const wrapper = mountComponent({ helperText: 'We never spam.' })

    expect(wrapper.text()).toContain('We never spam.')
  })

  it('links the message via aria-describedby', () => {
    const wrapper = mountComponent({ helperText: 'Helper' })

    const describedBy = getInput(wrapper).attributes('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(wrapper.find(`#${describedBy}`).text()).toBe('Helper')
  })

  it('hides helper text when hasErrors is true', () => {
    const wrapper = mountComponent({
      helperText: 'We never spam.',
      hasErrors: true,
    })

    expect(wrapper.text()).not.toContain('We never spam.')
  })

  it('keeps the external aria-describedby when the field has an error', () => {
    const wrapper = mountComponent(
      { hasErrors: true },
      { attrs: { 'aria-describedby': 'validation-error-1' } },
    )

    expect(getInput(wrapper).attributes('aria-describedby')).toBe(
      'validation-error-1',
    )
  })

  it('adds the helper text to the external aria-describedby', () => {
    const wrapper = mountComponent(
      { helperText: 'Helper' },
      { attrs: { 'aria-describedby': 'validation-error-1' } },
    )

    const [helperId, ...externalIds] =
      getInput(wrapper).attributes('aria-describedby')?.split(' ') ?? []
    expect(externalIds).toEqual(['validation-error-1'])
    expect(wrapper.get(`#${helperId}`).text()).toBe('Helper')
  })

  it('shows the bound value and emits what the customer types', async () => {
    const wrapper = mountComponent({ modelValue: 'old@example.com' })
    expect(getInput(wrapper).element.value).toBe('old@example.com')

    await getInput(wrapper).setValue('new@example.com')

    expect(wrapper.emitted('update:modelValue')).toEqual([['new@example.com']])
  })

  it('adds a screen-reader-only required suffix to the label', () => {
    const wrapper = mountComponent({ placeholder: 'Email', required: true })

    const suffix = wrapper.get('label .sr-only')
    expect(suffix.text()).toBe('(global.required)')
  })

  it('adds no required suffix to an optional field', () => {
    const wrapper = mountComponent({ placeholder: 'Email' })

    expect(wrapper.get('label').text()).toBe('Email')
  })
})
