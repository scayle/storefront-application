import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import type { NavigationItem } from '@scayle/storefront/types'
import SFBottomFooter from './SFBottomFooter.vue'

const defaultNavItems: NavigationItem[] = [
  {
    id: 1,
    name: 'Imprint',
    href: '/imprint',
    openInNewWindow: false,
    children: [],
    icon: undefined,
    linkColor: undefined,
    disabled: false,
  },
  {
    id: 2,
    name: 'Terms & Conditions',
    href: '/terms',
    openInNewWindow: false,
    children: [],
    icon: undefined,
    linkColor: undefined,
    disabled: false,
  },
]

/**
 * SFBottomFooter renders the bottom bar of the footer with copyright and legal/utility links.
 * Used in both main layout and simple (e.g. checkout) layout.
 */
const meta = {
  title: 'UI/Navigation/Footer/SFBottomFooter',
  component: SFBottomFooter,
  argTypes: {
    navigationItems: {
      control: 'object',
      description:
        'Links shown in the bottom footer row (e.g. Imprint, Terms).',
    },
  },
  render: (args: ComponentPropsAndSlots<typeof SFBottomFooter>) => ({
    components: { SFBottomFooter },
    setup() {
      return { args }
    },
    template: '<SFBottomFooter v-bind="args" />',
  }),
} satisfies Meta<typeof SFBottomFooter>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Default bottom footer with copyright and two links.
 */
export const Default: Story = {
  args: {
    navigationItems: defaultNavItems,
  },
}
