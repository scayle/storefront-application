import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { storybookCustomer } from '../../../../../.storybook/rpc-mock'
import SFProfileAccountInformation from './SFProfileAccountInformation.vue'

/**
 * SFProfileAccountInformation is the read-only card at the top of the account
 * profile page. It shows the customer number and email address of the
 * signed-in customer, with a note that neither can be changed here.
 */
export default {
  title: 'Account/Profile/SFProfileAccountInformation',
  component: SFProfileAccountInformation,
  args: { customer: storybookCustomer },
  argTypes: {
    customer: { control: false },
  },
  decorators: [
    () => ({ template: '<div class="w-[480px] max-w-full"><story /></div>' }),
  ],
} satisfies Meta<typeof SFProfileAccountInformation>

type Story = StoryObj<typeof SFProfileAccountInformation>

/** Signed-in customer with their customer number and email address. */
export const Default: Story = {}
