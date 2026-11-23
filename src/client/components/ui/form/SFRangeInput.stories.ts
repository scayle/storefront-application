import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ref } from 'vue'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import SFRangeInput from './SFRangeInput.vue'

/**
 * SFRangeInput is the text field next to a range slider where the user types
 * an exact bound, as in the price and savings filters of `SFFilterRangeSlider`.
 *
 * At rest it shows the formatted value (`$29.99`, `50%`). On focus it switches
 * to the plain number so the user can edit it, and on change it parses the
 * input with the country's decimal separator, rounds it to a whole unit and
 * clamps it to `min`/`max`. A clamp emits `clamp` so the parent can announce
 * the corrected value.
 *
 * The field has no visible label of its own, so always pass an `aria-label`.
 */
export default {
  title: 'UI/Form/SFRangeInput',
  component: SFRangeInput,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['price', 'percentage'],
    },
  },
  args: {
    variant: 'price',
    modelValue: 2999,
    currencyCode: 'USD',
    min: 0,
    max: 10000,
    onClamp: fn(),
  },
  render: (args) => ({
    components: { SFRangeInput },
    setup() {
      const value = ref(args.modelValue)
      const { country } = useStorefrontConfig()
      return { args, value, country }
    },
    template: `
      <div class="flex flex-col items-center gap-2">
        <SFRangeInput
          v-bind="args"
          v-model="value"
          :country="country"
          :format-options="{ minimumFractionDigits: 0 }"
          :aria-label="args.variant === 'price' ? 'Minimum price' : 'Minimum savings'"
        />
        <span class="text-secondary text-sm">modelValue: {{ value }}</span>
      </div>
    `,
  }),
} satisfies Meta<typeof SFRangeInput>

type Story = StoryObj<typeof SFRangeInput>

/**
 * Price at rest, formatted as currency from integer minor units. Type a value
 * above $100 and press Enter to see it clamped to `max`.
 */
export const Price: Story = {}

/** Price while focused: the plain number the user edits, without the currency symbol. */
export const PriceFocused: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox')
    await userEvent.click(input)
    await expect(input).toHaveValue('29.99')
  },
}

/** Percentage at rest, as used by the savings filter. */
export const Percentage: Story = {
  args: {
    variant: 'percentage',
    modelValue: 50,
    max: 100,
  },
}
