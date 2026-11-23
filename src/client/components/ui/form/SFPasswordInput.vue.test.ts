import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { DOMWrapper } from '@vue/test-utils'
import SFPasswordInput from './SFPasswordInput.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@assets/icons/input/hide-password.svg', () => ({
  default: {
    name: 'IconInputHidePassword',
    template: '<svg data-testid="icon-hide" />',
  },
}))
vi.mock('@assets/icons/input/show-password.svg', () => ({
  default: {
    name: 'IconInputShowPassword',
    template: '<svg data-testid="icon-show" />',
  },
}))

const tMock = (key: string) => key

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(SFPasswordInput, {
    props: { placeholder: 'Password', ...props },
    global: { mocks: { $t: tMock } },
  })

const getInput = (wrapper: ReturnType<typeof mountComponent>) =>
  wrapper.find('input') as DOMWrapper<HTMLInputElement>

describe('SFPasswordInput', () => {
  it('uses password type by default', () => {
    const wrapper = mountComponent()

    expect(getInput(wrapper).attributes('type')).toBe('password')
  })

  it('reveals the password when the toggle is clicked', async () => {
    const wrapper = mountComponent()
    const toggle = wrapper.get('button')
    expect(toggle.attributes('aria-label')).toBe('text_input.password.show')
    expect(toggle.attributes('aria-pressed')).toBe('false')

    await toggle.trigger('click')

    expect(getInput(wrapper).attributes('type')).toBe('text')
    expect(toggle.attributes('aria-label')).toBe('text_input.password.hide')
    expect(toggle.attributes('aria-pressed')).toBe('true')
  })

  it('hides the password again on a second click', async () => {
    const wrapper = mountComponent()
    const toggle = wrapper.get('button')

    await toggle.trigger('click')
    await toggle.trigger('click')

    expect(getInput(wrapper).attributes('type')).toBe('password')
    expect(toggle.attributes('aria-label')).toBe('text_input.password.show')
    expect(toggle.attributes('aria-pressed')).toBe('false')
  })

  it('shows the bound value and emits what the customer types', async () => {
    const wrapper = mountComponent({ modelValue: 'old-secret' })
    expect(getInput(wrapper).element.value).toBe('old-secret')

    await getInput(wrapper).setValue('new-secret')

    expect(wrapper.emitted('update:modelValue')).toEqual([['new-secret']])
  })

  it('renders a trailing link via the trailing-link slot', () => {
    const wrapper = mount(SFPasswordInput, {
      props: { placeholder: 'Password' },
      slots: {
        'trailing-link': '<a data-testid="forgot" href="#">Forgot?</a>',
      },
      global: { mocks: { $t: tMock } },
    })

    expect(wrapper.find('[data-testid="forgot"]').exists()).toBe(true)
  })
})
