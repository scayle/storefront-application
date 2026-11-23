import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { StorefrontNotification } from '@client/types'
import SFToast from './SFToast.vue'

/**
 * Global toast notification aligned with the Figma Notification (Global) spec.
 * Status type drives background, icon, and ARIA role. Supports optional title,
 * Standard Text Link action, and dismiss.
 */
export default {
  title: 'UI/Toast/SFToast',
  component: SFToast,
  parameters: { layout: 'centered' },
  args: {
    notification: {
      id: 'story-1',
      type: 'SUCCESS',
      title: 'Title!',
      message: 'Notification message example.',
      action: { text: 'View', href: '/' },
    } satisfies StorefrontNotification,
  },
  render: (args) => ({
    components: { SFToast },
    setup() {
      return { args }
    },
    template: `
    <div class="min-w-64">
      <SFToast v-bind="args" />
    </div>
    `,
  }),
} satisfies Meta<typeof SFToast>

type Story = StoryObj<typeof SFToast>

/**
 * Success status with title, message, action link, and dismiss.
 */
export const Success: Story = {
  args: {
    notification: {
      id: 'success',
      type: 'SUCCESS',
      title: 'Title!',
      message: 'Notification message example.',
      action: { text: 'View', href: '/' },
    },
  },
}

/**
 * Error status uses role alert and alert background token.
 */
export const ErrorStatus: Story = {
  args: {
    notification: {
      id: 'error',
      type: 'ERROR',
      title: 'Title!',
      message: 'Notification message example.',
      action: { text: 'View', href: '/' },
    },
  },
}

/**
 * Warning status uses role alert and warning background token.
 */
export const Warning: Story = {
  args: {
    notification: {
      id: 'warning',
      type: 'WARNING',
      title: 'Title!',
      message: 'Notification message example.',
      action: { text: 'View', href: '/' },
    },
  },
}

/**
 * Info status uses role status and info background at 50% opacity.
 */
export const Info: Story = {
  args: {
    notification: {
      id: 'info',
      type: 'INFO',
      title: 'Title!',
      message: 'Notification message example.',
      action: { text: 'View', href: '/' },
    },
  },
}

/**
 * Add-to-basket style copy with product title and message only.
 */
export const AddToBasket: Story = {
  args: {
    notification: {
      id: 'basket',
      type: 'SUCCESS',
      title: 'Nike Air Force 1',
      message: 'has been added to your basket.',
      action: { text: 'View', href: '/basket' },
    },
  },
}

/**
 * Message only without title or action.
 */
export const MessageOnly: Story = {
  args: {
    notification: {
      id: 'message-only',
      type: 'INFO',
      message: 'Notification message example.',
    },
  },
}
