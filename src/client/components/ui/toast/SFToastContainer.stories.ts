import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { NOTIFICATION_INJECTION_KEY } from '@client/plugins/notification'
import type { NotificationType } from '@client/types'
import { inject } from 'vue'
import { expect, userEvent, within } from 'storybook/test'
import SFButton from '../core/SFButton.vue'
import SFToastContainer from './SFToastContainer.vue'

const SHOW_TOAST_BUTTON_NAME = /show toast/i

/**
 * Container for the Global toast stack. Notifications appear at the top of the
 * viewport with gap-2 spacing. Type is passed through useToast / the notification plugin.
 */
export default {
  title: 'UI/Toast/SFToastContainer',
  component: SFToastContainer,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SFToastContainer>

type Story = StoryObj<typeof SFToastContainer>

const showTypedToast = (type: NotificationType, title?: string) => ({
  components: { SFToastContainer, SFButton },
  setup() {
    const api = inject(NOTIFICATION_INJECTION_KEY)!
    const showToast = () => {
      api.show('Notification message example.', {
        type,
        title: title ?? 'Title!',
        action: { text: 'View', href: '/' },
      })
    }
    return { showToast }
  },
  template: `
    <div class="min-h-48">
      <SFToastContainer />
      <SFButton class="mt-4" @click="showToast">Show toast</SFButton>
    </div>
  `,
})

/**
 * Triggers a success toast through the notification plugin.
 */
export const Success: Story = {
  render: () => showTypedToast('SUCCESS'),
}

/**
 * Triggers an error toast through the notification plugin.
 */
export const ErrorStatus: Story = {
  render: () => showTypedToast('ERROR'),
}

/**
 * Triggers a warning toast through the notification plugin.
 */
export const Warning: Story = {
  render: () => showTypedToast('WARNING'),
}

/**
 * Triggers an info toast through the notification plugin.
 */
export const Info: Story = {
  render: () => showTypedToast('INFO'),
}

/**
 * Stacks multiple toasts with gap-2 when shown in sequence.
 */
export const Stack: Story = {
  render: () => ({
    components: { SFToastContainer, SFButton },
    setup() {
      const api = inject(NOTIFICATION_INJECTION_KEY)!
      const showStack = () => {
        api.show('First notification.', { type: 'SUCCESS', title: 'First' })
        api.show('Second notification.', { type: 'INFO', title: 'Second' })
        api.show('Third notification.', { type: 'ERROR', title: 'Third' })
      }
      return { showStack }
    },
    template: `
      <div class="min-h-64">
        <SFToastContainer />
        <SFButton class="mt-4" @click="showStack">Show stack</SFButton>
      </div>
    `,
  }),
}

/**
 * Dismiss button removes the toast from the stack.
 */
export const Dismiss: Story = {
  render: () => ({
    components: { SFToastContainer, SFButton },
    setup() {
      const api = inject(NOTIFICATION_INJECTION_KEY)!
      const showToast = () => {
        api.show('Dismiss me.', { type: 'INFO', title: 'Title!' })
      }
      return { showToast }
    },
    template: `
      <div class="min-h-48">
        <SFToastContainer />
        <SFButton class="mt-4" @click="showToast">Show toast</SFButton>
      </div>
    `,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole('button', { name: SHOW_TOAST_BUTTON_NAME }),
    )
    const dismiss = await canvas.findByTestId('toast-dismiss')
    await userEvent.click(dismiss)
    await expect(canvas.queryByTestId('toast-info')).not.toBeInTheDocument()
  },
}

/**
 * Toast auto-dismisses when duration is set on show.
 */
export const AutoDismiss: Story = {
  render: () => ({
    components: { SFToastContainer, SFButton },
    setup() {
      const api = inject(NOTIFICATION_INJECTION_KEY)!
      const showToast = () => {
        api.show('Auto dismiss in 3 seconds.', {
          type: 'SUCCESS',
          duration: 3000,
        })
      }
      return { showToast }
    },
    template: `
      <div class="min-h-48">
        <SFToastContainer />
        <SFButton class="mt-4" @click="showToast">Show auto-dismiss toast</SFButton>
      </div>
    `,
  }),
}
