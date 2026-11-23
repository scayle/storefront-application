import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import SFSwitch from './SFSwitch.vue'

/**
 * SFSwitch is the design-system Toggle: an accessible binary switch built on
 * `SFSwitchBase` with optional label and helper text. Use `SFSwitchGroup` to
 * stack multiple switches with a shared disabled state and/or helper message.
 *
 * Key features:
 * - `v-model` for two-way binding.
 * - `role="switch"`, `aria-checked`, `aria-disabled`, `aria-describedby` wired by default.
 * - Label and helper slots; per-state color tokens drive label and helper text.
 * - Disabled propagates from a parent `SFSwitchGroup` (group-disabled wins over local prop).
 */
const meta = {
  title: 'UI/Form/SFSwitch',
  component: SFSwitch,
  parameters: { layout: 'centered' },
  argTypes: {
    id: { control: 'text', description: 'Unique identifier for the switch.' },
    label: {
      control: 'text',
      description: 'Text label rendered next to the switch.',
    },
    helperText: {
      control: 'text',
      description: 'Helper message rendered below the label.',
    },
    disabled: {
      control: 'boolean',
      description: 'When true, the switch is disabled.',
    },
    modelValue: {
      control: 'boolean',
      description: 'Current state of the switch.',
    },
  },
  args: {
    id: 'sf-switch',
    disabled: false,
    label: 'Switch label',
  },
} satisfies Meta<typeof SFSwitch>

export default meta
type Story = StoryObj<typeof SFSwitch>

const stateful = (initial: boolean) => ({
  components: { SFSwitch },
  setup() {
    const value = ref(initial)
    return { value }
  },
})

export const Default = {
  render: (args) => ({
    ...stateful(false),
    setup() {
      const value = ref(false)
      return { args, value }
    },
    template: `<SFSwitch v-bind="args" v-model="value" />`,
  }),
} satisfies Story

export const Checked = {
  args: { label: 'Enabled · checked' },
  render: (args) => ({
    components: { SFSwitch },
    setup() {
      const value = ref(true)
      return { args, value }
    },
    template: `<SFSwitch v-bind="args" v-model="value" />`,
  }),
} satisfies Story

export const Disabled = {
  args: { label: 'Disabled · off', disabled: true },
  render: (args) => ({
    components: { SFSwitch },
    setup() {
      const value = ref(false)
      return { args, value }
    },
    template: `<SFSwitch v-bind="args" v-model="value" />`,
  }),
} satisfies Story

export const DisabledChecked = {
  args: { label: 'Disabled · on', disabled: true },
  render: (args) => ({
    components: { SFSwitch },
    setup() {
      const value = ref(true)
      return { args, value }
    },
    template: `<SFSwitch v-bind="args" v-model="value" />`,
  }),
} satisfies Story

export const WithHelper = {
  args: {
    label: 'Receive marketing emails',
    helperText: 'You can unsubscribe at any time from your account settings.',
  },
  render: (args) => ({
    components: { SFSwitch },
    setup() {
      const value = ref(false)
      return { args, value }
    },
    template: `<SFSwitch v-bind="args" v-model="value" />`,
  }),
} satisfies Story

export const WithHelperChecked = {
  args: {
    label: 'Receive marketing emails',
    helperText: 'You can unsubscribe at any time from your account settings.',
  },
  render: (args) => ({
    components: { SFSwitch },
    setup() {
      const value = ref(true)
      return { args, value }
    },
    template: `<SFSwitch v-bind="args" v-model="value" />`,
  }),
} satisfies Story

export const WithHelperDisabled = {
  args: {
    label: 'Receive marketing emails',
    helperText: 'Disabled while your account is being verified.',
    disabled: true,
  },
  parameters: {
    a11y: {
      config: {
        // The helper text of an inactive switch takes the disabled color,
        // which WCAG 1.4.3 exempts as part of an inactive control. The switch
        // is only `aria-disabled`, so axe does not apply that exemption. The
        // selector skips only the helper text.
        rules: [
          { id: 'color-contrast', selector: '*:not([id^="switch-helper-"])' },
        ],
      },
    },
  },
  render: (args) => ({
    components: { SFSwitch },
    setup() {
      const value = ref(false)
      return { args, value }
    },
    template: `<SFSwitch v-bind="args" v-model="value" />`,
  }),
} satisfies Story

export const WithCustomLabel = {
  args: { id: 'custom-label-switch' },
  render: (args) => ({
    components: { SFSwitch },
    setup() {
      const value = ref(false)
      return { args, value }
    },
    template: `
      <SFSwitch v-bind="args" v-model="value">
        <template #label>
          <div class="flex flex-col">
            <span class="text-md font-semibold">Custom label</span>
            <span class="text-secondary text-sm">With description rendered via slot</span>
          </div>
        </template>
      </SFSwitch>
    `,
  }),
} satisfies Story
