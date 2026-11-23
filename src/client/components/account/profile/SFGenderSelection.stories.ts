import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import type { Customer } from '@scayle/storefront/types'
import SFGenderSelection from './SFGenderSelection.vue'

/**
 * SFGenderSelection is the gender dropdown in the personal information form on
 * the account profile page (`SFProfilePersonalInformation`). Each option has a
 * leading radio, and the trigger shows the translated label of the chosen value.
 * The render keeps both `v-model`s in local state, so picking an option updates
 * the trigger.
 */
export default {
  title: 'Account/Profile/SFGenderSelection',
  component: SFGenderSelection,
  argTypes: {
    modelValue: {
      control: { type: 'select' },
      options: ['m', 'f', 'd', 'n'] satisfies NonNullable<Customer['gender']>[],
    },
  },
  args: { disabled: false, isValid: true },
  render: (args) => ({
    components: { SFGenderSelection },
    setup() {
      const gender = ref(args.modelValue)
      const visible = ref(args.visible)
      return { args, gender, visible }
    },
    template: `
      <div class="w-[420px] max-w-full">
        <SFGenderSelection
          v-bind="args"
          v-model="gender"
          v-model:visible="visible"
        />
      </div>
    `,
  }),
} satisfies Meta<typeof SFGenderSelection>

type Story = StoryObj<typeof SFGenderSelection>

/** No gender chosen yet. */
export const Default: Story = {}

/** Customer with a saved gender, shown as its label in the trigger. */
export const Selected: Story = {
  args: { modelValue: 'f' },
}

/** Failed validation, shown with the error styling. */
export const Invalid: Story = {
  args: { isValid: false },
}

/** Disabled while the form saves. */
export const Disabled: Story = {
  args: { disabled: true, modelValue: 'f' },
}

/**
 * Open list with the chosen option's radio checked. Kept off the docs page:
 * the panel is a top-layer popover, so in the overview it covers the whole
 * page on small screens and detaches from its trigger when the page scrolls.
 */
export const Open: Story = {
  tags: ['!autodocs'],
  args: { modelValue: 'f', visible: true },
  decorators: [() => ({ template: '<div class="pb-72"><story /></div>' })],
}
