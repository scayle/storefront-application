import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { NavigationItem } from '@scayle/storefront/types'
import SFSimpleHeader from './SFSimpleHeader.vue'

const defaultNavItems: NavigationItem[] = [
  {
    id: 1,
    name: 'Shipping',
    href: '/checkout/shipping',
    openInNewWindow: false,
    children: [],
    icon: undefined,
    linkColor: undefined,
    disabled: false,
  },
  {
    id: 2,
    name: 'Payment',
    href: '/checkout/payment',
    openInNewWindow: false,
    children: [],
    icon: undefined,
    linkColor: undefined,
    disabled: false,
  },
]

/**
 * SFSimpleHeader is used on checkout/simple layout: back-to-shop link, logo, and optional checkout nav links.
 * Depends on Inertia page props for storefront.country.countryCode, and checkoutHeader.
 */
const meta = {
  title: 'UI/Navigation/Header/SFSimpleHeader',
  component: SFSimpleHeader,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    shopName: 'Storefront DE',
    navigationItems: defaultNavItems,
  },
  render: (args) => ({
    components: { SFSimpleHeader },
    setup: () => ({ args }),
    template: '<SFSimpleHeader v-bind="args" />',
  }),
} satisfies Meta<typeof SFSimpleHeader>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Simple header with back link, logo, and checkout links from preview mock (Shipping, Payment).
 */
export const Default = {
  args: {
    shopName: 'Storefront DE',
    navigationItems: defaultNavItems,
  },
} satisfies Story
