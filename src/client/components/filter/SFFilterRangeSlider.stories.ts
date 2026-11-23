import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { provide, ref } from 'vue'
import SFFilterRangeSlider from './SFFilterRangeSlider.vue'

/**
 * SFFilterRangeSlider is a wrapper around SFRangeSlider that handles currency formatting and specific filter logic.
 * It is used for price ranges and percentage ranges (like max savings).
 */
const meta = {
  title: 'Filter/SFFilterRangeSlider',
  component: SFFilterRangeSlider,
  argTypes: {
    filterSlug: {
      control: 'select',
      options: ['prices', 'max_savings_percentage'],
      description: 'Determines the formatting and behavior of the slider.',
    },
    min: {
      control: 'number',
      description: 'Minimum value (minor units for price)',
    },
    max: {
      control: 'number',
      description: 'Maximum value (minor units for price)',
    },
    modelValue: {
      control: 'object',
      description: 'Current range value tuple [min, max]',
    },
  },
  render: (args) => ({
    components: { SFFilterRangeSlider },
    setup() {
      const value = ref(args.modelValue)

      // Mock Inertia usePage
      provide('page', {
        props: {
          storefront: {
            country: {
              currency: { currencyCode: 'EUR' },
            },
          },
        },
      })

      return { args, value }
    },
    template: `
      <div>
        <SFFilterRangeSlider v-bind="args" v-model="value" />
        <div class="mt-4 text-sm text-secondary">
          Value: {{ value }}
        </div>
      </div>
    `,
  }),
} satisfies Meta<typeof SFFilterRangeSlider>

export default meta
type Story = StoryObj<typeof SFFilterRangeSlider>

/**
 * Default usage for price filtering.
 * Values are in minor units (cents) if currency has decimals.
 */
export const PriceFilter = {
  args: {
    filterSlug: 'prices',
    min: 0,
    max: 10000, // 100.00 EUR
    modelValue: [2000, 8000], // 20.00 - 80.00 EUR
  },
} satisfies Story

/**
 * Usage for percentage filtering (e.g. max savings).
 * Values are integers (0 decimal places).
 */
export const PercentageFilter = {
  args: {
    filterSlug: 'max_savings_percentage',
    min: 0,
    max: 100,
    modelValue: [10, 50],
  },
} satisfies Story
