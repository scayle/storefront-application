import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import SFSwitchBase from './SFSwitchBase.vue'

/**
 * SFSwitchBase is the bare toggle control from the design system: a
 * `role="switch"` button with a sliding thumb and no label of its own.
 * `SFSwitch` composes it with a label and helper text; use the base directly
 * only inside a custom layout that supplies the accessible name through
 * `aria-label` or `aria-labelledby`.
 *
 * A disabled parent `SFSwitchGroup` disables every switch inside it, whatever
 * the switch's own `disabled` prop says. An enabled group leaves that prop in
 * charge.
 */
export default {
  title: 'UI/Form/SFSwitchBase',
  component: SFSwitchBase,
  parameters: { layout: 'centered' },
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    id: 'switch-base',
    ariaLabel: 'Receive marketing emails',
    disabled: false,
    modelValue: false,
  },
  render: (args) => ({
    components: { SFSwitchBase },
    setup() {
      const model = ref(args.modelValue)
      return { args, model }
    },
    template: `<SFSwitchBase v-bind="args" v-model="model" />`,
  }),
} satisfies Meta<typeof SFSwitchBase>

type Story = StoryObj<typeof SFSwitchBase>

/** Off, enabled resting state. Click the switch to toggle it. */
export const Off: Story = {}

/** On, enabled resting state with the accent track. */
export const On: Story = {
  args: { modelValue: true },
}

/** Disabled switch: grayed out, announced as disabled, and clicks do nothing. */
export const Disabled: Story = {
  args: { disabled: true },
}

/**
 * Full state matrix: every selection combined with every interactive state.
 * Hover and focus are shown by applying the hover color and the `focus-style`
 * utility directly, so the states can be compared against the Figma reference
 * without interacting.
 */
export const StateMatrix: Story = {
  render: () => ({
    components: { SFSwitchBase },
    setup() {
      const columns = ['Enabled', 'Hover', 'Focus', 'Disabled']
      const off = ref(false)
      const on = ref(true)
      return { columns, off, on }
    },
    template: `
      <div class="grid grid-cols-[80px_repeat(4,1fr)] items-center gap-4 text-sm">
        <span></span>
        <span v-for="column in columns" :key="column" class="font-semibold">{{ column }}</span>

        <span class="font-semibold">Off</span>
        <SFSwitchBase id="base-off-enabled" v-model="off" aria-label="Off, enabled" />
        <SFSwitchBase id="base-off-hover" v-model="off" aria-label="Off, hover" class="bg-gray-500!" />
        <SFSwitchBase id="base-off-focus" v-model="off" aria-label="Off, focus" class="focus-style" />
        <SFSwitchBase id="base-off-disabled" v-model="off" aria-label="Off, disabled" disabled />

        <span class="font-semibold">On</span>
        <SFSwitchBase id="base-on-enabled" v-model="on" aria-label="On, enabled" />
        <SFSwitchBase id="base-on-hover" v-model="on" aria-label="On, hover" class="bg-accent/75!" />
        <SFSwitchBase id="base-on-focus" v-model="on" aria-label="On, focus" class="focus-style" />
        <SFSwitchBase id="base-on-disabled" v-model="on" aria-label="On, disabled" disabled />
      </div>
    `,
  }),
}
