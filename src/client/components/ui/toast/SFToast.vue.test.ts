import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type {
  NotificationOnClickActions,
  StorefrontNotification,
} from '@client/types'
import SFToast from './SFToast.vue'

const closeMock = vi.fn()

vi.mock('@client/composables/useToast', () => ({
  useToast: () => ({ close: closeMock }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@client/components/ui/links/SFLink.vue', async () => ({
  default: (await import('@test/stubs/common')).SFLinkStub,
}))

vi.mock('@client/components/ui/core/SFButton.vue', () => ({
  default: {
    name: 'SFButton',
    template:
      '<button type="button" :aria-label="$attrs[\'aria-label\']" @click="$emit(\'click\')"><slot name="prepend-icon" /></button>',
  },
}))

vi.mock('@client/assets/icons/notify/success.svg', () => ({
  default: {
    name: 'IconNotifySuccess',
    template: '<svg data-testid="icon-success" />',
  },
}))
vi.mock('@client/assets/icons/notify/alert.svg', () => ({
  default: {
    name: 'IconNotifyAlert',
    template: '<svg data-testid="icon-error" />',
  },
}))
vi.mock('@client/assets/icons/notify/warning.svg', () => ({
  default: {
    name: 'IconNotifyWarning',
    template: '<svg data-testid="icon-warning" />',
  },
}))
vi.mock('@client/assets/icons/notify/info.svg', () => ({
  default: {
    name: 'IconNotifyInfo',
    template: '<svg data-testid="icon-info" />',
  },
}))
vi.mock('@client/assets/icons/navigation/close.svg', () => ({
  default: { name: 'IconNavigationClose', template: '<svg />' },
}))

const baseNotification: StorefrontNotification = {
  id: 'toast-1',
  message: 'Notification message example.',
  type: 'SUCCESS',
}

const mountToast = (notification: StorefrontNotification) =>
  mount(SFToast, {
    props: { notification },
    global: { mocks: { $t: (key: string) => key } },
  })

describe('SFToast', () => {
  it.for([
    { type: 'SUCCESS', icon: 'icon-success' },
    { type: 'ERROR', icon: 'icon-error' },
    { type: 'WARNING', icon: 'icon-warning' },
    { type: 'INFO', icon: 'icon-info' },
  ] as const)('shows the $icon for a $type toast', ({ type, icon }) => {
    const wrapper = mountToast({ ...baseNotification, type })

    expect(wrapper.find(`[data-testid="${icon}"]`).exists()).toBe(true)
  })

  // Errors and warnings interrupt the screen reader, the rest wait their turn.
  it.for([
    { type: 'ERROR', role: 'alert' },
    { type: 'WARNING', role: 'alert' },
    { type: 'SUCCESS', role: 'status' },
    { type: 'INFO', role: 'status' },
  ] as const)('gives a $type toast the $role role', ({ type, role }) => {
    const wrapper = mountToast({ ...baseNotification, type })

    expect(wrapper.attributes('role')).toBe(role)
  })

  it('renders title when provided', () => {
    const wrapper = mountToast({
      ...baseNotification,
      title: 'Title!',
    })

    expect(wrapper.text()).toContain('Title!')
    expect(wrapper.text()).toContain('Notification message example.')
  })

  it('renders action link and dismiss button', () => {
    const wrapper = mountToast({
      ...baseNotification,
      action: { text: 'View', href: '/basket' },
    })

    expect(wrapper.find('a[href="/basket"]').text()).toBe('View')
    expect(wrapper.find('[data-testid="toast-dismiss"]').exists()).toBe(true)
  })

  it('calls close when dismiss is clicked', async () => {
    closeMock.mockClear()
    const wrapper = mountToast(baseNotification)

    await wrapper.find('[data-testid="toast-dismiss"]').trigger('click')

    expect(closeMock).toHaveBeenCalledWith('toast-1')
  })

  it('closes the toast through the handler of a text-only action', async () => {
    const onClick = vi.fn(({ close }: NotificationOnClickActions) => close())
    const wrapper = mountToast({
      ...baseNotification,
      action: { text: 'Undo', onClick },
    })

    const button = wrapper.find('[data-testid="toast-info-button"]')
    expect(button.text()).toBe('Undo')
    await button.trigger('click')

    expect(onClick).toHaveBeenCalledOnce()
    expect(closeMock).toHaveBeenCalledWith('toast-1')
  })
})
