import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SFHint from './SFHint.vue'

describe('SFHint', () => {
  it('renders the title and body inline in one text block', () => {
    const wrapper = mount(SFHint, {
      props: { title: 'Success!' },
      slots: { default: 'Your changes have been saved.' },
    })

    expect(wrapper.get('p').text()).toBe(
      'Success! Your changes have been saved.',
    )
  })

  it('renders only the body when no title is provided', () => {
    const wrapper = mount(SFHint, {
      slots: { default: 'Items reserved for 15 minutes.' },
    })

    expect(wrapper.get('p').text()).toBe('Items reserved for 15 minutes.')
  })

  it('renders no status icon or role when type is omitted', () => {
    const wrapper = mount(SFHint, { slots: { default: 'Hello' } })

    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(false)
    expect(wrapper.attributes('role')).toBeUndefined()
  })

  it('renders custom icon without status background when type is omitted', () => {
    const wrapper = mount(SFHint, {
      slots: {
        default: 'Promotion applied.',
        icon: '<span data-testid="custom-icon" />',
      },
    })

    expect(wrapper.find('[data-testid="custom-icon"]').exists()).toBe(true)
    expect(wrapper.classes().some((c) => c.startsWith('bg-status-'))).toBe(
      false,
    )
  })

  it('renders trailing content beside the message', () => {
    const wrapper = mount(SFHint, {
      props: { title: 'Promotion applied' },
      slots: {
        default: 'Check your basket total.',
        trailing: '<span data-testid="trailing">Go</span>',
      },
    })

    expect(wrapper.find('[data-testid="trailing"]').exists()).toBe(true)
    expect(wrapper.text()).toContain(
      'Promotion applied Check your basket total.',
    )
    expect(wrapper.text()).toContain('Go')
  })

  // Errors and warnings interrupt the screen reader, the rest wait their turn.
  it.for([
    { type: 'ERROR', role: 'alert' },
    { type: 'WARNING', role: 'alert' },
    { type: 'SUCCESS', role: 'status' },
    { type: 'INFO', role: 'status' },
  ] as const)('gives a $type hint the $role role', ({ type, role }) => {
    const wrapper = mount(SFHint, {
      props: { type },
      slots: { default: 'Invalid email address.' },
    })

    expect(wrapper.attributes('role')).toBe(role)
  })
})
