import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import SFSwitch from './SFSwitch.vue'
import SFSwitchGroup from './SFSwitchGroup.vue'

/**
 * SFSwitchGroup stacks multiple `SFSwitch` instances and shares a group-level
 * disabled state plus an optional helper message. Each child remains
 * independently bindable; only the disabled flag and the shared helper are
 * inherited from the group.
 */
const meta = {
  title: 'UI/Form/SFSwitchGroup',
  component: SFSwitchGroup,
  argTypes: {
    legend: {
      control: 'text',
      description: 'Visible legend rendered above the group.',
    },
    helperText: {
      control: 'text',
      description: 'Shared helper rendered below the stack.',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables every descendant switch when true.',
    },
  },
  args: {
    legend: 'Notifications',
    helperText: '',
    disabled: false,
  },
} satisfies Meta<typeof SFSwitchGroup>

export default meta
type Story = StoryObj<typeof SFSwitchGroup>

export const Default = {
  render: (args) => ({
    components: { SFSwitchGroup, SFSwitch },
    setup() {
      const email = ref(true)
      const sms = ref(false)
      const push = ref(false)
      return { args, email, sms, push }
    },
    template: `
      <SFSwitchGroup v-bind="args">
        <SFSwitch id="group-email" v-model="email" label="Email" />
        <SFSwitch id="group-sms" v-model="sms" label="SMS" />
        <SFSwitch id="group-push" v-model="push" label="Push notifications" />
      </SFSwitchGroup>
    `,
  }),
} satisfies Story

export const WithHelpers = {
  args: {
    legend: 'Notifications',
    helperText: 'You can change these at any time from your account.',
  },
  render: (args) => ({
    components: { SFSwitchGroup, SFSwitch },
    setup() {
      const email = ref(true)
      const sms = ref(false)
      return { args, email, sms }
    },
    template: `
      <SFSwitchGroup v-bind="args">
        <SFSwitch
          id="group-email-helper"
          v-model="email"
          label="Email"
          helperText="Receive order updates and offers."
        />
        <SFSwitch
          id="group-sms-helper"
          v-model="sms"
          label="SMS"
          helperText="Standard message rates may apply."
        />
      </SFSwitchGroup>
    `,
  }),
} satisfies Story

export const Disabled = {
  args: {
    legend: 'Notifications',
    helperText: 'Disabled while your account is being verified.',
    disabled: true,
  },
  render: (args) => ({
    components: { SFSwitchGroup, SFSwitch },
    setup() {
      const email = ref(true)
      const sms = ref(false)
      const push = ref(true)
      return { args, email, sms, push }
    },
    template: `
      <SFSwitchGroup v-bind="args">
        <SFSwitch id="group-disabled-email" v-model="email" label="Email" />
        <SFSwitch id="group-disabled-sms" v-model="sms" label="SMS" />
        <SFSwitch id="group-disabled-push" v-model="push" label="Push notifications" />
      </SFSwitchGroup>
    `,
  }),
} satisfies Story
