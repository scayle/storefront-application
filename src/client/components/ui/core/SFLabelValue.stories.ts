import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import { TextSize, TextTag } from '@client/utils/constants'
import SFLabelValue from './SFLabelValue.vue'

/**
 * `SFLabelValue` renders a `Label: Value` pair using two font weights on a single line.
 * The label uses `font-semibold` and the value uses `font-normal`, matching the
 * Storefront Type Hierarchy.
 *
 * Color is fixed per size: `default` → `text-secondary` (metadata), `large` →
 * `text-primary` (emphasized fields).
 */
export default {
  title: 'UI/Core/SFLabelValue',
  component: SFLabelValue,
  parameters: { layout: 'centered' },
  argTypes: {
    size: {
      control: 'select',
      options: Object.values(TextSize),
    },
    tag: {
      control: 'select',
      options: Object.values(TextTag),
    },
  },
  render: (args: ComponentPropsAndSlots<typeof SFLabelValue>) => ({
    components: { SFLabelValue },
    setup() {
      return { args }
    },
    template: `<SFLabelValue v-bind="args">{{ args.value }}</SFLabelValue>`,
  }),
} satisfies Meta<typeof SFLabelValue>

type Story = StoryObj<typeof SFLabelValue>

/**
 * Default label/value pair at `text-sm` / `text-secondary`. The most common
 * frontend example is a metadata field such as `Order ID: 12345`.
 */
export const Default = {
  args: {
    size: TextSize.DEFAULT,
    label: 'Order ID:',
    value: '#A1B2-C3D4',
  },
} satisfies Story

/**
 * Both sizes side-by-side. `default` is metadata (`text-secondary`), `large` is
 * an emphasized field (`text-primary`).
 */
export const Sizes = {
  render: () => ({
    components: { SFLabelValue },
    setup() {
      const rows = [
        {
          size: TextSize.DEFAULT,
          label: 'Order ID:',
          value: '#A1B2-C3D4',
        },
        {
          size: TextSize.LARGE,
          label: 'Total:',
          value: '€129.00',
        },
      ]
      return { rows }
    },
    template: `
      <div class="flex flex-col gap-3">
        <SFLabelValue
          v-for="{ size, label, value } in rows"
          :key="size"
          :size="size"
          :label="label"
        >
          {{ value }}
        </SFLabelValue>
      </div>
    `,
  }),
} satisfies Story
