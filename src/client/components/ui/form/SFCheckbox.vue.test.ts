import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SFCheckbox from './SFCheckbox.vue'

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(SFCheckbox, {
    props: { id: 'checkbox-1', label: 'Accept', ...props },
  })

const getMessage = (wrapper: ReturnType<typeof mountComponent>) =>
  wrapper.get('input').attributes('aria-describedby')

describe('SFCheckbox - feedback channels', () => {
  it('renders no feedback message when no channel is active', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toBe('Accept')
    expect(getMessage(wrapper)).toBeUndefined()
  })

  it('renders helper text and links it via aria-describedby', () => {
    const wrapper = mountComponent({ helperText: 'We never spam.' })
    const describedBy = getMessage(wrapper)
    expect(describedBy).toBeTruthy()
    expect(wrapper.get(`#${describedBy}`).text()).toBe('We never spam.')
  })

  it('renders info text and links it via aria-describedby', () => {
    const wrapper = mountComponent({ infoText: 'Heads up.' })
    expect(wrapper.get(`#${getMessage(wrapper)}`).text()).toBe('Heads up.')
  })

  it('renders error text and links it via aria-describedby', () => {
    const wrapper = mountComponent({ errorText: 'Required.' })
    expect(wrapper.get(`#${getMessage(wrapper)}`).text()).toBe('Required.')
  })

  it('marks the control invalid when errorText is set', () => {
    const wrapper = mountComponent({ errorText: 'Required.' })
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
  })
})

describe('SFCheckbox - label', () => {
  it('ties the label slot to the checkbox', () => {
    const wrapper = mount(SFCheckbox, {
      props: { id: 'checkbox-1' },
      slots: { label: 'I agree to the terms' },
    })
    const label = wrapper.get('label')

    expect(label.attributes('for')).toBe(wrapper.get('input').attributes('id'))
    expect(label.text()).toBe('I agree to the terms')
  })
})
