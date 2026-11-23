import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import { LowStockIndicatorSize } from '@client/utils/constants'
import SFLowStockBanner from './SFLowStockBanner.vue'

/**
 * SFLowStockBanner is a static low-stock status badge driven by design-system tokens.
 *
 * Parents resolve i18n copy and visibility. The component exposes Large and Small sizes
 * for PDP or basket summary vs compact line items and product cards.
 */
export default {
  title: 'Product/SFLowStockBanner',
  component: SFLowStockBanner,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFLowStockBanner>) => ({
    components: { SFLowStockBanner },
    setup() {
      return { args }
    },
    template: `<SFLowStockBanner v-bind="args" />`,
  }),
  argTypes: {
    message: {
      description: 'The resolved low-stock message to display.',
      control: 'text',
    },
    size: {
      control: { type: 'select' },
      options: Object.values(LowStockIndicatorSize),
      description:
        'Large for PDP and basket summary. Small for basket line items and product cards.',
    },
  },
} satisfies Meta<typeof SFLowStockBanner>

type Story = StoryObj<typeof SFLowStockBanner>

/**
 * Large variant for primary contexts (PDP, basket summary).
 */
export const Large: Story = {
  args: {
    size: LowStockIndicatorSize.LARGE,
    message: 'Hurry, only a few items left!',
  },
}

/**
 * Small variant for compact contexts (basket line items, product cards).
 */
export const Small: Story = {
  args: {
    size: LowStockIndicatorSize.SMALL,
    message: 'Only 5 items left!',
  },
}

/**
 * Placement examples from the Figma "Frontend Examples" frame.
 */
export const FrontendExamples: Story = {
  render: () => ({
    components: { SFLowStockBanner },
    template: `
      <div class="flex max-w-md flex-col gap-8 p-4">
        <section class="flex flex-col gap-3">
          <p class="text-secondary text-sm font-semibold">PDP (under add to basket)</p>
          <div class="flex flex-col gap-3 rounded-xl border border-gray-300 p-4">
            <div class="flex gap-3">
              <div class="bg-gray-200 h-10 flex-1 rounded-lg" />
              <div class="bg-gray-200 h-10 w-15 rounded-lg" />
            </div>
            <SFLowStockBanner
              size="large"
              message="Hurry, only a few items left!"
            />
          </div>
        </section>
        <section class="flex flex-col gap-3">
          <p class="text-secondary text-sm font-semibold">Basket line item</p>
          <div class="flex flex-col gap-2 rounded-xl border border-gray-300 p-4">
            <div class="flex gap-3">
              <div class="bg-gray-200 size-20 shrink-0 rounded-md" />
              <div class="flex flex-1 flex-col gap-2">
                <div class="bg-gray-200 h-4 w-3/4 rounded" />
                <div class="bg-gray-200 h-4 w-1/2 rounded" />
              </div>
            </div>
            <SFLowStockBanner
              size="small"
              message="Only 5 items left!"
            />
          </div>
        </section>
      </div>
    `,
  }),
}
