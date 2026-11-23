import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import SFOrderSuccessGreetingBox from './SFOrderSuccessGreetingBox.vue'

/**
 * SFOrderSuccessGreetingBox shows a success checkmark icon with a thank-you message
 * and email confirmation text. Displayed at the top of the order success page
 * to confirm the purchase.
 */
export default {
  title: 'Order Success/SFOrderSuccessGreetingBox',
  component: SFOrderSuccessGreetingBox,
  render: (args: ComponentPropsAndSlots<typeof SFOrderSuccessGreetingBox>) => ({
    components: { SFOrderSuccessGreetingBox },
    setup() {
      return { args }
    },
    template: `<SFOrderSuccessGreetingBox v-bind="args" />`,
  }),
} satisfies Meta<typeof SFOrderSuccessGreetingBox>

type Story = StoryObj<typeof SFOrderSuccessGreetingBox>

/**
 * Default greeting box as displayed after a successful order.
 */
export const Default: Story = {
  args: {},
}
