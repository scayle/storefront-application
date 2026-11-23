import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import SFOrderSuccessDetailBox from './SFOrderSuccessDetailBox.vue'

/**
 * SFOrderSuccessDetailBox is a generic card wrapper used on the order success page.
 * It renders a bold headline (h2) followed by slot content inside a bordered container.
 *
 * Used by SFOrderSuccessOrderData, SFOrderSuccessPaymentData, and SFOrderSuccessAddressInfo.
 */
export default {
  title: 'Order Success/SFOrderSuccessDetailBox',
  component: SFOrderSuccessDetailBox,
  render: (args: ComponentPropsAndSlots<typeof SFOrderSuccessDetailBox>) => ({
    components: { SFOrderSuccessDetailBox },
    setup() {
      return { args }
    },
    template: `
      <SFOrderSuccessDetailBox v-bind="args">
        <p class="text-secondary">Slot content goes here.</p>
      </SFOrderSuccessDetailBox>
    `,
  }),
} satisfies Meta<typeof SFOrderSuccessDetailBox>

type Story = StoryObj<typeof SFOrderSuccessDetailBox>

/**
 * Default detail box with a title and placeholder slot content.
 */
export const Default: Story = {
  args: {
    title: 'Order details',
  },
}
