import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { ref } from 'vue'
import SFRangeSlider from './SFRangeSlider.vue'

/**
 * SFRangeSlider is a dual-thumb slider component that allows users to select a range of values.
 * It provides visual feedback and supports custom styling, steps, and tooltips.
 */
const meta = {
  title: 'UI/Form/SFRangeSlider',
  component: SFRangeSlider,
  argTypes: {
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    disabled: { control: 'boolean' },
    modelValue: { control: 'object' },
  },
} satisfies Meta<typeof SFRangeSlider>

export default meta
type Story = StoryObj<typeof SFRangeSlider>

/**
 * The default range slider with standard min/max values and a predefined range.
 */
export const Default = {
  render: (args: ComponentPropsAndSlots<typeof SFRangeSlider>) => ({
    components: { SFRangeSlider },
    setup() {
      const value = ref(args.modelValue)
      return { args, value }
    },
    template: `
      <div class="w-full">
        <SFRangeSlider v-bind="args" v-model="value" />
        <div class="mt-4 text-sm text-secondary">
          Value: {{ value }}
        </div>
      </div>
    `,
  }),
  args: {
    min: 0,
    max: 100,
    step: 1,
    modelValue: [20, 80],
  },
} satisfies Story

/**
 * The disabled state prevents user interaction with the slider.
 */
export const Disabled = {
  ...Default,
  args: {
    ...Default.args,
    disabled: true,
  },
  parameters: {
    a11y: {
      config: {
        // The faded value labels belong to an inactive control, which WCAG
        // 1.4.3 exempts from the contrast minimum. The thumbs are only
        // `aria-disabled`, so axe does not apply that exemption itself. The
        // selector skips only the faded slider.
        rules: [{ id: 'color-contrast', selector: '*:not(.opacity-50 *)' }],
      },
    },
  },
} satisfies Story

/**
 * Demonstrates a slider with a custom range (100-1000) and step size (50).
 */
export const CustomRange = {
  ...Default,
  args: {
    min: 100,
    max: 1000,
    step: 50,
    modelValue: [200, 800],
  },
} satisfies Story

/**
 * A slider with small values and step size of 1.
 */
export const SmallStep = {
  ...Default,
  args: {
    min: 0,
    max: 10,
    step: 1,
    modelValue: [2, 8],
  },
} satisfies Story

/**
 * Demonstrates how to use the `tooltip` slot to customize the value display.
 * This example adds a currency symbol and custom styling.
 */
export const CustomTooltip = {
  render: (args: ComponentPropsAndSlots<typeof SFRangeSlider>) => ({
    components: { SFRangeSlider },
    setup() {
      const value = ref([20, 80])
      return { args, value }
    },
    template: `
      <div class="w-full">
        <SFRangeSlider v-bind="args" v-model="value">
          <template #tooltip="{ value }">
             <div class="bg-primary text-white px-2 py-1 rounded text-sm whitespace-nowrap mb-8">
              €{{ value }}
            </div>
          </template>
        </SFRangeSlider>
        <div class="mt-4 text-sm text-secondary">
          Value: {{ value }}
        </div>
      </div>
    `,
  }),
  args: {
    min: 0,
    max: 100,
    step: 1,
    modelValue: [20, 80],
  },
} satisfies Story
