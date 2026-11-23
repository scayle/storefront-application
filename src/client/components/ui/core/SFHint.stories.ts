import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import IconAvailabilitySoldout from '@client/assets/icons/availability/soldout.svg'
import { TextTag } from '@client/utils/constants'
import SFHint from './SFHint.vue'

/**
 * `SFHint` renders inline Form notifications (Figma Notification Form variant)
 * when `type` is set: status background, default status icon, `padding-3`, and
 * `gap-3`. Pass `#icon` to replace the default icon. Pass `class` to override
 * container colors (for example a promotion background).
 */
export default {
  title: 'UI/Core/SFHint',
  component: SFHint,
  parameters: { layout: 'centered' },
  argTypes: {
    tag: {
      control: 'select',
      options: Object.values(TextTag),
    },
    type: {
      control: 'select',
      options: ['SUCCESS', 'ERROR', 'WARNING', 'INFO'],
    },
  },
  render: (args: ComponentPropsAndSlots<typeof SFHint>) => ({
    components: { SFHint },
    setup() {
      return { args }
    },
    template: `<SFHint v-bind="args">{{ args.default }}</SFHint>`,
  }),
} satisfies Meta<typeof SFHint>

type Story = StoryObj<typeof SFHint>

/**
 * Form notification with success status, title, and message.
 */
export const Success: Story = {
  args: {
    type: 'SUCCESS',
    title: 'Title!',
    default: 'Notification message example.',
  },
}

/**
 * Form notification with error status.
 */
export const ErrorStatus: Story = {
  args: {
    type: 'ERROR',
    default: 'Please correct the highlighted fields.',
  },
}

/**
 * Form notification with warning status.
 */
export const Warning: Story = {
  args: {
    type: 'WARNING',
    default: 'Your session will expire soon.',
  },
}

/**
 * Form notification with info status.
 */
export const Info: Story = {
  args: {
    type: 'INFO',
    default: 'We sent a confirmation email to your inbox.',
  },
}

/**
 * Typography hint without a notification type or status icon.
 */
export const WithoutType: Story = {
  args: {
    default: 'Items in your basket are reserved for the next 15 minutes.',
  },
}

/**
 * Replaces the default status icon via the `#icon` slot.
 */
export const WithCustomIcon: Story = {
  args: {
    type: 'WARNING',
    title: 'Not available yet',
    default: 'This product will be available from the date shown.',
  },
  render: (args: ComponentPropsAndSlots<typeof SFHint>) => ({
    components: {
      SFHint,
      IconAvailabilitySoldout,
    },
    setup() {
      return { args }
    },
    template: `
      <SFHint v-bind="args">
        <template #icon>
          <IconAvailabilitySoldout class="size-4" aria-hidden="true" />
        </template>
        {{ args.default }}
      </SFHint>
    `,
  }),
}
